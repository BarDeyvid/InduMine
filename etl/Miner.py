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
import re

# ------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------
BASE_URL = "https://www.weg.net"
START_URL = "https://www.weg.net/institutional/BR/en/"

OUTPUT_FILE = Path("data/weg_products_final.csv")
CHROMEDRIVER_PATH = r"C:\chromedriver\chromedriver.exe"
WAIT_TIMEOUT = 30
MAX_WORKERS = 8
MAX_DRIVERS = 8

# ------------------------------------------------------------------
# Logging
# ------------------------------------------------------------------
logging.basicConfig(
    filename="logs/scraper.log",
    filemode="a",
    level=logging.DEBUG,
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

def extract_links_from_navigation(soup: BeautifulSoup, current_url: str) -> list[str]:
    """Extract navigation links from category/navigation pages using specific selectors."""
    next_urls = []
    
    # All the navigation selectors combined from the second version
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
    
    # Pagination links (using data-href attribute)
    pagination_links = soup.select("ul.pagination a[data-href]")
    for a in pagination_links:
        data_href = a.get("data-href")
        if data_href:
            full_pag_url = urljoin(BASE_URL, data_href)
            next_urls.append(full_pag_url)

    # Remove duplicates and the current URL
    next_urls = list(set([u for u in next_urls if u != current_url]))
    
    return next_urls

def extract_tech_specs(soup: BeautifulSoup, url: str) -> list[list[str]]:
    """
    Extracts technical specifications from the product datasheet section 
    and returns a list of [URL, Feature, Value] rows.
    """
    scraped_data = []

    # 1. Find the main datasheet tab content
    datasheet_div = soup.find('div', id='datasheet')
    if not datasheet_div:
        return scraped_data

    # Helper function to process standard key-value tables (Frame, Output, Features, etc.)
    def process_key_value_tables(container):
        rows = []
        # Find all data tables with the key-value structure
        for table in container.find_all('table', class_='table-striped'):
            if table.find_previous_sibling('h4', string=lambda t: t in ['Efficiency', 'Power factor']):
                continue

            for tr in table.find_all('tr'):
                th = tr.find('th')
                td = tr.find('td')
                if th and td:
                    feature = th.get_text(strip=True).replace(':', '')
                    value = td.get_text(strip=True)
                    if feature and value:
                        feature = re.sub(r'¹|²|³|⁴', '', feature).strip()
                        rows.append([url, feature, value])
        return rows

    # Extract data from 'Electric Motors' and 'Features' sections
    scraped_data.extend(process_key_value_tables(datasheet_div))
    
    # Loop over Efficiency and Power factor sections
    for section_title, prefix in [('Efficiency', 'Efficiency'), ('Power factor', 'Power factor')]:
        section = datasheet_div.find('h4', string=section_title)
        if section:
            table = section.find_next_sibling('table', class_='table-striped')
            if table:
                headers = [th.get_text(strip=True) for th in table.select('tbody tr:first-child th') if th.get_text(strip=True)]
                data_row = table.select_one('tbody tr:nth-child(2)')
                if data_row:
                    values = [td.get_text(strip=True) for td in data_row.find_all('td')]
                    
                    for header, value in zip(headers, values):
                        feature = f"{prefix} @ {header}"
                        scraped_data.append([url, feature, value])

    return scraped_data

def extract_product_info(soup: BeautifulSoup, url: str) -> list[list[str]]:
    """Extracts product name, code and image link."""
    scraped_data = []

    # 1. Scrape Product Name
    name_div = soup.find('div', class_='product-card-title')
    if name_div:
        product_name = name_div.get_text(strip=True).replace(':', '').strip()
        scraped_data.append([url, "Product Name", product_name])

    # 2. Scrape Product Code
    code_small = soup.select_one("small.product-card-info")
    if code_small:
        product_code = code_small.get_text(strip=True).replace(':', '').strip()
        scraped_data.append([url, "Product Code", product_code])

    # 3. Scrape Image Link
    image_div = soup.find('div', id='productImageContainerImage')
    if image_div:
        img_tag = image_div.select_one("img")
        if img_tag and img_tag.get('src'):
            product_image = img_tag['src']
            if not product_image.startswith('http'):
                product_image = urljoin(BASE_URL, product_image)
            scraped_data.append([url, "Product Image", product_image])

    return scraped_data

# ------------------------------------------------------------------
# Synchronous worker (runs inside a thread) - FIXED FOR LINK LOSS
# ------------------------------------------------------------------
def scrape_page_sync(url: str, retries=2) -> ScrapeResult:
    """
    Acquires a driver from the pool, loads the page, scrapes data, and returns/quits the driver.
    The wait logic is now defensive, allowing link extraction even if elements timeout.
    """
    driver = None
    soup = None

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

        # Wait selector from second version
        wait_selector = (
            "a.xtt-url-categories, div.product-info-specs, "
            "td.product-code, a.btn.btn-primary.btn-sm.btn-block, "
            "#productMenuContent, section.product-row-techspecs, "
            "ul.pagination"
        )
        
        try:
            WebDriverWait(driver, WAIT_TIMEOUT).until(
                EC.presence_of_element_located(("css selector", wait_selector))
            )
        except TimeoutException:
            logging.warning(f"Wait timeout on {url}. Proceeding with page source extraction.")
            driver_ok = False

        # Get page source regardless of wait success/failure
        soup = BeautifulSoup(driver.page_source, "html.parser")

    except WebDriverException as e:
        logging.error(f"Selenium error on {url}. Driver may be stale/corrupt. Error: {e}")
        driver_ok = False
        return ScrapeResult(next_urls=[], scraped_rows=[])
    except Exception as e:
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

    scraped_rows = []
    next_urls = []

    # Check if this is a product page - using both old and new structure checks
    if (soup.find('section', class_='product-row-techspecs') or 
        soup.find('div', id='datasheet') or
        soup.select_one("div.product-info-specs table.table")):
        
        logging.info(f"Product page detected: {url}. Scraping technical specs.")
        
        # Extract technical specifications from new structure
        tech_specs = extract_tech_specs(soup, url)
        if tech_specs:
            scraped_rows.extend(tech_specs)
        else:
            # Fallback to old structure
            specs_table = soup.select_one("div.product-info-specs table.table")
            if specs_table:
                for tr in specs_table.find_all("tr"):
                    th, td = tr.find("th"), tr.find("td")
                    if th and td:
                        scraped_rows.append([url, th.get_text(strip=True), td.get_text(strip=True)])
        
        # Extract product info
        scraped_rows.extend(extract_product_info(soup, url))
        
        # Don't follow any links from product pages
        next_urls = []
    
    else:
        # This is a category/navigation page - extract links to follow
        logging.info(f"Navigation page detected: {url}. Extracting links.")
        next_urls = extract_links_from_navigation(soup, url)
        
        # Filter out non-WEG URLs
        filtered_urls = []
        for link in next_urls:
            if BASE_URL in link:
                filtered_urls.append(link)
        next_urls = filtered_urls
        
        # Log how many links were found
        if next_urls:
            logging.info(f"Found {len(next_urls)} sub-links on {url}")
        
        # No data to scrape from category pages
        scraped_rows = []

    return ScrapeResult(next_urls=next_urls, scraped_rows=scraped_rows)

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

    pbar = tqdm_asyncio(desc="Crawling Pages", unit="page")

    while pending_urls or tasks:
        while pending_urls and len(tasks) < MAX_WORKERS:
            url_to_scrape = pending_urls.pop()
            if url_to_scrape in visited_urls:
                continue

            visited_urls.add(url_to_scrape)
            task = loop.run_in_executor(executor, scrape_page_sync, url_to_scrape)
            tasks.add(task)
            pbar.total = len(visited_urls) + len(tasks)

        if not tasks:
            await asyncio.sleep(0.1)
            continue

        done, tasks = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)

        for future in done:
            try:
                result = await future
                pbar.update(1)
                
                if result.scraped_rows:
                    all_scraped_rows.extend(result.scraped_rows)
                
                # Add new URLs to pending queue
                for new_url in result.next_urls:
                    if new_url not in visited_urls and new_url not in pending_urls:
                        pending_urls.add(new_url)
                        
            except Exception as e:
                logging.error(f"Error processing task result: {e}")

    pbar.close()
    executor.shutdown(wait=True)
    return all_scraped_rows

# ------------------------------------------------------------------
# Entry point 
# ------------------------------------------------------------------
async def main() -> None:
    """Main function to run the scraper and save the results."""
    start_time = time.time()
    
    # Initialize driver pool
    for _ in range(min(MAX_DRIVERS, 4)): 
        try:
            driver = create_driver_instance()
            CHROME_POOL.put_nowait(driver)
        except Exception as e:
            logging.error(f"Failed to create driver for pool: {e}")

    final_rows = await crawl(START_URL)

    # Clean up any drivers left in the pool
    while True:
        try:
            driver = CHROME_POOL.get_nowait()
            driver.quit()
        except Empty:
            break
        except Exception:
            pass

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
            # Group by URL to create pivot table
            pivoted_df = df.pivot_table(index="Product URL", columns="Feature", values="Value", aggfunc='first')
            pivoted_df.reset_index(inplace=True)
            pivoted_output_file = Path("data/grouped_products_final.csv")
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