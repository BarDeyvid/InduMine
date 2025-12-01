import asyncio
from concurrent.futures import ThreadPoolExecutor
import csv
import logging
import time
from pathlib import Path
from urllib.parse import urljoin
from typing import NamedTuple
from queue import Queue, Empty, Full
import os

import pandas as pd
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.common.exceptions import WebDriverException, TimeoutException
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from urllib3.exceptions import MaxRetryError, NewConnectionError
from tqdm.asyncio import tqdm_asyncio
import re

# ------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------
BASE_URL = "https://www.weg.net"
START_URL = "https://www.weg.net/institutional/BR/en/"

OUTPUT_FILE = Path("data/weg_products_final.csv")
CHROMEDRIVER_PATH = r"C:\Users\deyvid_barcelos\Documents\chromedriver\chromedriver.exe"
WAIT_TIMEOUT = 30
MAX_WORKERS = 5 
MAX_DRIVERS = 5 


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
# Global driver pool: Thread-safe standard Queue                     # 
# ------------------------------------------------------------------ #
CHROME_POOL: Queue = Queue(maxsize=MAX_DRIVERS)


# ------------------------------------------------------------------ #
# Helper: Creates a fresh headless Chrome instance                   #
# ------------------------------------------------------------------ #
def create_driver_instance() -> webdriver.Chrome:
    """
    Creates a brand-new, configured headless Chrome driver instance.
    """
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
    opts.add_argument("--disable-dev-shm-usage") 
    opts.add_argument("--ignore-certificate-errors")
    opts.add_argument("--window-size=1920,1080")
    
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


def extract_tech_specs(soup: BeautifulSoup, url: str) -> list[list[str]]:
    """
    Extracts technical specifications from the product datasheet section 
    and returns a list of [URL, Feature, Value] rows.
    """
    scraped_data = []
    
    datasheet_div = soup.find('div', id='datasheet')
    if not datasheet_div:
        return scraped_data

    def process_key_value_tables(container):
        rows = []
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

    scraped_data.extend(process_key_value_tables(datasheet_div))

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

# ------------------------------------------------------------------
# Synchronous worker (runs inside a thread)
# ------------------------------------------------------------------
def scrape_page_sync(url: str, retries=3) -> ScrapeResult:
    """
    Acquires a driver from the pool, loads the page, scrapes data.
    """
    
    for attempt in range(retries): 
        driver = None
        soup = None 
        driver_ok = True
        
        # ACQUIRE DRIVER
        try:
            driver = CHROME_POOL.get_nowait()
            
            # --- Check if the driver process is actually alive ---
            if driver.service.process is None or driver.service.process.poll() is not None:
                logging.warning("Retrieved a dead driver from pool. Discarding and creating new one.")
                try:
                    driver.quit() # Ensure it's closed if partial
                except:
                    pass
                driver = create_driver_instance()
            # ----------------------------------------------------------

        except Empty:
            try:
                driver = create_driver_instance()
            except WebDriverException:
                logging.critical(f"Failed to create driver on attempt {attempt + 1}. Retrying.")
                continue 

        try:
            driver.get(url)

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
                logging.warning(f"Wait timeout on {url} (Attempt {attempt + 1}). Proceeding with page source extraction.")
                driver_ok = False
            
            soup = BeautifulSoup(driver.page_source, "html.parser")
                
        except (WebDriverException, MaxRetryError, NewConnectionError, ConnectionError) as e:
            logging.error(f"Driver connection failed on {url} (Attempt {attempt + 1}). The driver likely crashed. Error: {e}")
            driver_ok = False
            continue 
        except Exception as e:
            logging.error(f"Unexpected error during scrape of {url} (Attempt {attempt + 1}). Error: {e}")
            driver_ok = False
            continue 
        finally:
            if driver:
                if driver_ok:
                    try:
                        CHROME_POOL.put_nowait(driver)
                    except Full:
                        try:
                            driver.quit()
                        except:
                            pass
                else:
                    # Driver failed, kill it
                    try:
                        driver.quit() 
                    except Exception:
                        pass 

        if not soup:
            continue
        
        # ------------------------------------------------------------------ #
        # --- Extraction Logic ---                                           #
        # ------------------------------------------------------------------ #
        scraped_rows = []
        
        if soup.find('section', class_='product-row-techspecs'):
            logging.info(f"Product page (new structure) detected: {url}.")
            scraped_rows = extract_tech_specs(soup, url)
        
        elif soup.select_one("div.product-info-specs table.table"):
            specs_table = soup.select_one("div.product-info-specs table.table")
            for tr in specs_table.find_all("tr"):
                th, td = tr.find("th"), tr.find("td")
                if th and td:
                    scraped_rows.append([url, th.get_text(strip=True), td.get_text(strip=True)])

        if scraped_rows:
            logging.info(f"Found {len(scraped_rows)} total specs on {url}")
            return ScrapeResult(next_urls=[], scraped_rows=scraped_rows)

        # Navigation extraction
        next_urls = []
        selectors = [
            "#productMenuContent li a[href]", "a.xtt-url-categories[href]",
            "#products-selection a[href]", "a.btn.btn-primary.btn-sm.btn-block[href]",
            "td.product-code a[href]", "li.xtt-listing-grid-product h4 a[href]",
            "li#products-selection a[href]"
        ]
        
        all_link_tags = []
        for sel in selectors:
            all_link_tags.extend(soup.select(sel))
        
        for a in all_link_tags:
            href = a.get("href")
            if href and href.strip() != "#":
                next_urls.append(urljoin(BASE_URL, href))
        
        for a in soup.select("ul.pagination a[data-href]"):
            data_href = a.get("data-href")
            if data_href:
                next_urls.append(urljoin(BASE_URL, data_href))

        next_urls = list(set([u for u in next_urls if u != url])) 

        if next_urls:
            logging.info(f"Found {len(next_urls)} sub-links on {url}")
            return ScrapeResult(next_urls=next_urls, scraped_rows=[])
            
    return ScrapeResult(next_urls=[], scraped_rows=[])

# ------------------------------------------------------------------
# Async dispatcher
# ------------------------------------------------------------------
async def crawl(start_url: str) -> list[list[str]]:
    executor = ThreadPoolExecutor(max_workers=MAX_WORKERS) 
    loop = asyncio.get_running_loop()

    tasks = set()
    pending_urls = {start_url}
    visited_urls = set()
    all_scraped_rows = []

    pbar = tqdm_asyncio(total=1, desc="Crawling Pages", unit="page")

    try:
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
                await asyncio.sleep(0.1) 
                continue

            done, tasks = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            
            for future in done:
                try:
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
                except Exception as e:
                    logging.error(f"Task failed with error: {e}")
                    pbar.update(1)

    except asyncio.CancelledError:
        logging.info("Crawl loop cancelled.")
        for t in tasks: t.cancel()
        raise

    finally:
        pbar.close()
        executor.shutdown(wait=False)
        
    return all_scraped_rows

# ------------------------------------------------------------------
# Entry point 
# ------------------------------------------------------------------
async def main() -> None:
    start_time = time.time()
    final_rows = []
    
    try:
        final_rows = await crawl(START_URL)
    except asyncio.CancelledError:
        logging.info("Main task cancelled.")
    
    while not CHROME_POOL.empty():
        try:
            driver = CHROME_POOL.get_nowait()
            driver.quit()
        except:
            pass
    
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    
    with OUTPUT_FILE.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Product URL", "Feature", "Value"])
        if final_rows:
            writer.writerows(final_rows)

    elapsed = time.time() - start_time
    logging.info(f"Done! Saved {len(final_rows)} rows in {elapsed:.2f}s.")

    if final_rows:
        try:
            df = pd.read_csv(OUTPUT_FILE)
            df = df.drop_duplicates(subset=["Product URL", "Feature"])
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
        logging.info("Scraping cancelled by user. Cleaning up processes...")
        os.system("taskkill /f /im chromedriver.exe >nul 2>&1")
        os.system("taskkill /f /im chrome.exe >nul 2>&1")
    except Exception as e:
        logging.critical(f"A critical error occurred: {e}", exc_info=True)