import asyncio
from concurrent.futures import ThreadPoolExecutor
import csv
import logging
import time
from pathlib import Path
from urllib.parse import urljoin
from typing import NamedTuple
from queue import Queue, Empty, Full 

import pandas as pd
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.common.exceptions import WebDriverException, TimeoutException
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from tqdm.asyncio import tqdm_asyncio

# ------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------
BASE_URL = "https://www.weg.net"
START_URL = "https://www.weg.net/institutional/BR/en/"

OUTPUT_FILE = Path("data/weg_products_final.csv")
CHROMEDRIVER_PATH = r"C:\chromedriver\chromedriver.exe" 
WAIT_TIMEOUT = 15
MAX_WORKERS = 8 # Maximum concurrent threads (tasks)
MAX_DRIVERS = 4 # Maximum concurrent drivers (Pool size)


# ------------------------------------------------------------------
# Logging
# ------------------------------------------------------------------
logging.basicConfig(
    filename="logs/scraper_test.log",
    filemode="a",
    level=logging.INFO,
    format="%(asctime)s %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)


# ------------------------------------------------------------------ #
# Global driver pool: Now using a thread-safe standard Queue         # 
# ------------------------------------------------------------------ #
CHROME_POOL: Queue = Queue(maxsize=MAX_DRIVERS)


# ------------------------------------------------------------------ #
# Helper: Creates a fresh headless Chrome instance                   #
# ------------------------------------------------------------------ #
def create_driver_instance() -> webdriver.Chrome:
    """Creates a brand-new, configured headless Chrome driver instance."""
    opts = Options()
    opts.add_argument("--headless=new") 
    opts.add_argument("--disable-gpu")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--log-level=3")
    opts.add_experimental_option('excludeSwitches', ['enable-logging'])
    opts.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    )
    try:
        # Increase the IPC read timeout for better stability on hang/slow responses
        service = Service(CHROMEDRIVER_PATH, service_args=["--read-timeout=300"])
        return webdriver.Chrome(service=service, options=opts)
    except WebDriverException as e:
        logging.critical(f"Failed to create ChromeDriver. Path check needed. Error: {e}")
        raise


# ------------------------------------------------------------------
# Data Structures
# ------------------------------------------------------------------
class ScrapeResult(NamedTuple):
    next_urls: list[str]
    scraped_rows: list[list[str]]


# ------------------------------------------------------------------
# Synchronous worker (runs inside a thread) - FIXED FOR LINK LOSS
# ------------------------------------------------------------------
def scrape_page_sync(url: str, retries=2) -> ScrapeResult:
    """
    Acquires a driver from the pool, loads the page, scrapes data, and returns/quits the driver.
    The wait logic is now defensive, allowing link extraction even if elements timeout.
    """
    driver = None
    soup = None # Initialize soup object
    
    # ACQUIRE DRIVER: Try to pull a driver from the thread-safe pool
    try:
        driver = CHROME_POOL.get_nowait()
    except Empty:
        try:
            driver = create_driver_instance()
        except WebDriverException:
            return ScrapeResult(next_urls=[], scraped_rows=[])

    driver_ok = True 
    try:
        # Start page load
        driver.get(url)

        wait_selector = (
            "a.xtt-url-categories, div.product-info-specs, "
            "td.product-code, a.btn.btn-primary.btn-sm.btn-block, "
            "#productMenuContent"
        )
        
        # 2. Attempt to wait for key elements. This part might timeout.
        try:
            WebDriverWait(driver, WAIT_TIMEOUT).until(
                EC.presence_of_element_located(("css selector", wait_selector))
            )
        except TimeoutException:
            # If the wait times out, log the warning, mark the driver as potentially unstable,
            # but DO NOT return. Proceed to extract links from the current page source.
            logging.warning(f"Wait timeout on {url}. Proceeding with page source extraction.")
            driver_ok = False
        
        # Get page source regardless of wait success/failure
        soup = BeautifulSoup(driver.page_source, "html.parser")
            
    except WebDriverException as e:
        # Catches connection errors or fatal Selenium errors (e.g., Read timed out)
        logging.error(f"Selenium error on {url}. Driver may be stale/corrupt. Error: {e}")
        driver_ok = False
        return ScrapeResult(next_urls=[], scraped_rows=[])
    except Exception as e:
        # Catch any other unexpected error 
        logging.error(f"Unexpected error during scrape of {url}. Error: {e}")
        driver_ok = False
        return ScrapeResult(next_urls=[], scraped_rows=[])
    finally:
        # RELEASE DRIVER: Quit if stale, otherwise put back in pool.
        if driver:
            if driver_ok:
                try:
                    CHROME_POOL.put_nowait(driver)
                except Full:
                    driver.quit()
            else:
                try:
                    driver.quit() 
                except Exception:
                    pass 

    # If the page failed to load entirely (WebDriverException), soup will be None
    if not soup:
        return ScrapeResult(next_urls=[], scraped_rows=[])

    # --- Data Extraction Logic ---
    rows = []
    specs_table = soup.select_one("div.product-info-specs table.table")
    if specs_table:
        for tr in specs_table.find_all("tr"):
            th, td = tr.find("th"), tr.find("td")
            if th and td:
                rows.append([url, th.get_text(strip=True), td.get_text(strip=True)])
        if rows:
            logging.info(f"Found {len(rows)} specs on {url}")
            return ScrapeResult(next_urls=[], scraped_rows=rows)

    # Navigation page. Find all possible links.
    next_urls = []
    main_menu_links = soup.select("#productMenuContent li a[href]")
    category_links = soup.select("a.xtt-url-categories[href]")
    subcategory_links = soup.select("#products-selection a[href]")
    product_list_buttons = soup.select("a.btn.btn-primary.btn-sm.btn-block[href]")
    product_detail_links = soup.select("td.product-code a[href]")
    product_title_links = soup.select("li.xtt-listing-grid-product h4 a[href]")
    product_selection_links = soup.select("li#products-selection a[href]")

    all_link_tags = (
        main_menu_links + 
        category_links + 
        subcategory_links +
        product_list_buttons + 
        product_detail_links +
        product_title_links +
        product_selection_links
    )
    
    for a in all_link_tags:
        href = a.get("href")
        if href and href.strip() != "#":
            full_url = urljoin(BASE_URL, href)
            next_urls.append(full_url)
            
    if next_urls:
        logging.info(f"Found {len(next_urls)} sub-links on {url}")

    return ScrapeResult(next_urls=list(set(next_urls)), scraped_rows=[])


# ------------------------------------------------------------------
# Async dispatcher
# ------------------------------------------------------------------
async def crawl(start_url: str) -> list[list[str]]:
    """Manages the crawling process, dispatching tasks to a thread pool."""
    executor = ThreadPoolExecutor(max_workers=MAX_WORKERS)
    loop = asyncio.get_running_loop()

    tasks = set()
    pending_urls = {start_url}
    visited_urls = set()
    all_scraped_rows = []

    pbar = tqdm_asyncio(total=1, desc="Crawling Pages", unit="page")

    while pending_urls or tasks:
        while pending_urls and len(tasks) < MAX_WORKERS:
            url_to_scrape = pending_urls.pop()
            if url_to_scrape in visited_urls:
                pbar.total = max(1, pbar.total - 1) 
                continue
            
            visited_urls.add(url_to_scrape)
            task = loop.run_in_executor(executor, scrape_page_sync, url_to_scrape)
            tasks.add(task)

        if not tasks:
            await asyncio.sleep(0.1) # Prevent busy-waiting
            continue

        done, tasks = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
        
        for future in done:
            result = await future
            pbar.update(1)
            if result.scraped_rows:
                all_scraped_rows.extend(result.scraped_rows)
            
            new_urls = 0
            for u in result.next_urls:
                if u not in visited_urls and u not in pending_urls:
                    pending_urls.add(u)
                    new_urls += 1
            
            if new_urls > 0:
                pbar.total += new_urls
    
    pbar.close()
    executor.shutdown(wait=True)
    return all_scraped_rows

# ------------------------------------------------------------------
# Entry point (Modified Cleanup)
# ------------------------------------------------------------------
async def main() -> None:
    """Main function to run the scraper and save the results."""
    start_time = time.time()
    final_rows = await crawl(START_URL)

    # Clean up any drivers left in the pool using a synchronous loop
    while True:
        try:
            driver = CHROME_POOL.get_nowait()
            driver.quit()
        except Empty:
            break
        except Exception:
            pass # Ignore errors on quitting a driver that might already be dead
    
    # Ensure the output directory exists
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    
    # Save the raw data
    with OUTPUT_FILE.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Product URL", "Feature", "Value"])
        if final_rows:
            writer.writerows(final_rows)

    elapsed = time.time() - start_time
    logging.info(
        f"Done! Data saved to '{OUTPUT_FILE}' with {len(final_rows)} rows in {elapsed:.2f}s."
    )

    # Pivot and save the data
    if final_rows:
        try:
            df = pd.read_csv(OUTPUT_FILE)
            pivoted_df = df.pivot_table(index="Product URL", columns="Feature", values="Value", aggfunc='first')
            pivoted_df.reset_index(inplace=True)
            pivoted_output_file = "grouped_products_final.csv"
            pivoted_df.to_csv(pivoted_output_file, index=False)
            logging.info(f"Pivoted data saved to '{pivoted_output_file}'.")
        except Exception as e:
            logging.error(f"Could not pivot data. Error: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logging.info("Scraping cancelled by user.")
    except Exception as e:
        logging.critical(f"A critical error occurred: {e}", exc_info=True)