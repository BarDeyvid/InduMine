import asyncio
from concurrent.futures import ThreadPoolExecutor
import csv
import logging
import time
from pathlib import Path
from urllib.parse import urljoin
from typing import NamedTuple

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

OUTPUT_FILE = Path("database/weg_products_final.csv")
CHROMEDRIVER_PATH = r"C:\chromedriver\chromedriver.exe" 
WAIT_TIMEOUT = 15
MAX_WORKERS = 8 # Lowered for better stability on most systems


# ------------------------------------------------------------------
# Logging
# ------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)


# ------------------------------------------------------------------
# Helper: create a fresh headless ChromeDriver
# ------------------------------------------------------------------
def make_driver() -> webdriver.Chrome:
    """Creates and returns a configured, headless Chrome driver instance."""
    opts = Options()
    opts.add_argument("--headless=new") # Use new headless mode, old one Weg BLocks it
    opts.add_argument("--disable-gpu") # Not needed in headless mode
    opts.add_argument("--no-sandbox")
    opts.add_argument("--log-level=3")
    opts.add_experimental_option('excludeSwitches', ['enable-logging'])
    opts.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    )
    try:
        service = Service(CHROMEDRIVER_PATH)
        return webdriver.Chrome(service=service, options=opts)
    except WebDriverException as e:
        logging.error(f"Failed to create ChromeDriver. Ensure path is correct. Error: {e}")
        raise


# ------------------------------------------------------------------
# Data Structures
# ------------------------------------------------------------------
class ScrapeResult(NamedTuple):
    next_urls: list[str]
    scraped_rows: list[list[str]]


# ------------------------------------------------------------------
# Synchronous worker (runs inside a thread)
# ------------------------------------------------------------------
def scrape_page_sync(url: str, retries=2) -> ScrapeResult:
    """
    Loads a single page with retries, scrapes specs or finds sub-URLs.
    """
    try:
        driver = make_driver() # <-- This is the line that fails
    except WebDriverException as e:
        logging.error(f"Failed to create driver for {url}. Error: {e}")
        return ScrapeResult(next_urls=[], scraped_rows=[]) # Return empty result

    try:
        driver.get(url)
        wait_selector = (
            "a.xtt-url-categories, div.product-info-specs, "
            "td.product-code, a.btn.btn-primary.btn-sm.btn-block, "
            "#productMenuContent"
        )
        WebDriverWait(driver, WAIT_TIMEOUT).until(
            EC.presence_of_element_located(("css selector", wait_selector))
        )
        soup = BeautifulSoup(driver.page_source, "html.parser")
    except TimeoutException:
        logging.warning(f"Timeout on {url}")
        return ScrapeResult(next_urls=[], scraped_rows=[])
    except WebDriverException as e:
        logging.error(f"Selenium error on {url}: {e}")
        return ScrapeResult(next_urls=[], scraped_rows=[])
    finally:
        driver.quit()

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

    # 2. If no specs, it's a navigation page. Find all possible links.
    next_urls = []
    main_menu_links = soup.select("#productMenuContent li a[href]")
    category_links = soup.select("a.xtt-url-categories[href]")
    product_list_buttons = soup.select("a.btn.btn-primary.btn-sm.btn-block[href]")
    product_detail_links = soup.select("td.product-code a[href]")
    all_link_tags = (
        main_menu_links + 
        category_links + 
        product_list_buttons + 
        product_detail_links
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
# Entry point
# ------------------------------------------------------------------
async def main() -> None:
    """Main function to run the scraper and save the results."""
    start_time = time.time()
    final_rows = await crawl(START_URL)

    with OUTPUT_FILE.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Product URL", "Feature", "Value"])
        writer.writerows(final_rows)

    elapsed = time.time() - start_time
    logging.info(
        f"Done! Data saved to '{OUTPUT_FILE}' with {len(final_rows)} rows in {elapsed:.2f}s."
    )

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
        logging.critical(f"A critical error occurred: {e}")