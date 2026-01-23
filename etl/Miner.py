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
    
    # All the navigation selectors combined
    main_menu_links = soup.select("#productMenuContent li a[href]")
    category_links = soup.select("a.xtt-url-categories[href]")
    subcategory_links = soup.select("#products-selection a[href]")
    product_list_buttons = soup.select("a.btn.btn-primary.btn-sm.btn-block[href]")
    product_detail_links = soup.select("td.product-code a[href]")
    product_title_links = soup.select("li.xtt-listing-grid-product h4 a[href]")
    product_selection_links = soup.select("li#products-selection a[href]")
    product_image_links = soup.select("a.xtt-product-image-zoom[href]")  # Corrected selector

    all_link_tags = (
        main_menu_links + 
        category_links + 
        subcategory_links +
        product_list_buttons + 
        product_detail_links +
        product_title_links +
        product_selection_links +
        product_image_links
    )
    
    for a in all_link_tags:
        href = a.get("href")
        if href and href.strip() != "#":
            # Skip direct image files in navigation
            if not any(ext in href.lower() for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']):
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

# ------------------------------------------------------------------
# EXTRACTION LOGIC 
# ------------------------------------------------------------------
def extract_product_data(soup: BeautifulSoup, url: str) -> list[list[str]]:
    """
    Extracts product data including images and flattens it 
    into a list of [URL, Feature, Value] rows for CSV storage.
    """
    data = {
        "name": None,
        "code": None,
        "description": None,
        "features": {},
        "details": {},
        "images": []  # Added for image URLs
    }

    # Nome
    name = soup.select_one("h1.product-card-title")
    if name:
        data["name"] = name.get_text(strip=True)

    # Código
    code = soup.select_one("small.product-card-info")
    if code:
        data["code"] = code.get_text(strip=True).replace("Product:", "").strip()

    # Descrição
    desc = soup.select_one("div.xtt-product-description p")
    if desc:
        data["description"] = desc.get_text(strip=True)

    # Product features
    features_block = soup.select_one("div.product-info-specs")
    if features_block:
        for table in features_block.select("table.table"):
            for tr in table.select("tr"):
                th, td = tr.find("th"), tr.find("td")
                if th and td:
                    data["features"][th.get_text(strip=True)] = td.get_text(strip=True)

    # Product details
    for table in soup.select("table.table-striped"):
        for tr in table.select("tr"):
            th, td = tr.find("th"), tr.find("td")
            if th and td:
                data["details"][th.get_text(strip=True)] = td.get_text(strip=True)

    # IMAGE EXTRACTION - ADDED THIS SECTION
    # Look for product images in various locations
    image_selectors = [
        # Main product image
        "div.product-image img[src]",
        "img.product-image[src]",
        "div.xtt-product-image-zoom img[src]",
        # Gallery images
        "div.product-gallery img[src]",
        "ul.product-thumbnails img[src]",
        "div.carousel-item img[src]",
        # General product images
        "div.product-images img[src]",
        "section.product-images img[src]",
        # Any img tag that might contain product image
        "img[src*='product']",
        "img[src*='Product']",
    ]
    
    seen_images = set()
    for selector in image_selectors:
        img_tags = soup.select(selector)
        for img in img_tags:
            src = img.get('src')
            if src and src.strip():
                # Handle relative URLs
                if src.startswith('/'):
                    full_url = urljoin(BASE_URL, src)
                elif src.startswith('http'):
                    full_url = src
                else:
                    full_url = urljoin(url, src)
                
                # Avoid duplicates and non-image files
                if (full_url not in seen_images and 
                    any(ext in full_url.lower() for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp'])):
                    data["images"].append(full_url)
                    seen_images.add(full_url)
    
    # Also check for image links in anchor tags (common for zoom/high-res images)
    image_links = soup.select("a[href*='.jpg'], a[href*='.jpeg'], a[href*='.png'], a[href*='.gif'], a[href*='.webp']")
    for link in image_links:
        href = link.get('href')
        if href and href.strip():
            if href.startswith('/'):
                full_url = urljoin(BASE_URL, href)
            elif href.startswith('http'):
                full_url = href
            else:
                full_url = urljoin(url, href)
            
            if full_url not in seen_images:
                data["images"].append(full_url)
                seen_images.add(full_url)

    # --- Flattening to CSV Rows ---
    scraped_rows = []
    
    if data["name"]:
        scraped_rows.append([url, "Product Name", data["name"]])
    if data["code"]:
        scraped_rows.append([url, "Product Code", data["code"]])
    if data["description"]:
        scraped_rows.append([url, "Description", data["description"]])
    
    for k, v in data["features"].items():
        scraped_rows.append([url, k, v])
        
    for k, v in data["details"].items():
        scraped_rows.append([url, k, v])
    
    # Add image URLs to scraped rows - ADDED THIS
    for i, img_url in enumerate(data["images"], 1):
        scraped_rows.append([url, f"Image URL {i}", img_url])

    return scraped_rows

# ------------------------------------------------------------------
# Synchronous worker (runs inside a thread)
# ------------------------------------------------------------------
def scrape_page_sync(url: str, retries=2) -> ScrapeResult:
    """
    Acquires a driver from the pool, loads the page, scrapes data, and returns/quits the driver.
    """
    driver = None
    soup = None

    # ACQUIRE DRIVER
    try:
        driver = CHROME_POOL.get_nowait()
    except Empty:
        try:
            driver = create_driver_instance()
        except WebDriverException:
            return ScrapeResult(next_urls=[], scraped_rows=[])

    driver_ok = True
    try:
        driver.get(url)

        wait_selector = (
            "a.xtt-url-categories, div.product-info-specs, "
            "td.product-code, a.btn.btn-primary.btn-sm.btn-block, "
            "#productMenuContent, section.product-row-techspecs, "
            "ul.pagination, h1.product-card-title"
        )
        
        try:
            WebDriverWait(driver, WAIT_TIMEOUT).until(
                EC.presence_of_element_located(("css selector", wait_selector))
            )
        except TimeoutException:
            logging.warning(f"Wait timeout on {url}. Proceeding with page source extraction.")
            driver_ok = False

        soup = BeautifulSoup(driver.page_source, "html.parser")

    except Exception as e:
        logging.error(f"Error on {url}: {e}")
        driver_ok = False
        return ScrapeResult(next_urls=[], scraped_rows=[])
    finally:
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

    if not soup:
        return ScrapeResult(next_urls=[], scraped_rows=[])

    scraped_rows = []
    next_urls = []

    # Check if this is a product page (using the selectors from the new logic)
    # If it has a product title or product details table, treat as product
    is_product_page = (
        soup.select_one("h1.product-card-title") or 
        soup.select_one("div.product-info-specs") or
        soup.select_one("div.xtt-product-description")
    )

    if is_product_page:
        logging.info(f"Product page detected: {url}")
        # Use the NEW extraction logic
        scraped_rows = extract_product_data(soup, url)
        next_urls = [] # Usually don't want to go deeper from a product page
    
    else:
        # Navigation page
        logging.info(f"Navigation page detected: {url}")
        next_urls = extract_links_from_navigation(soup, url)
        filtered_urls = [u for u in next_urls if BASE_URL in u]
        next_urls = filtered_urls
        scraped_rows = []

    return ScrapeResult(next_urls=next_urls, scraped_rows=scraped_rows)

# ------------------------------------------------------------------
# Helper: Load visited URLs for Resuming
# ------------------------------------------------------------------
def load_visited_urls(filepath: Path) -> set:
    """Reads the CSV and returns a set of URLs already scraped."""
    visited = set()
    if not filepath.exists():
        return visited
    
    try:
        # Use pandas for quick reading, only read the Product URL column
        df = pd.read_csv(filepath, usecols=["Product URL"])
        visited = set(df["Product URL"].unique())
        logging.info(f"Resumed session: Found {len(visited)} URLs already scraped.")
    except Exception as e:
        logging.warning(f"Could not load existing CSV for resuming: {e}")
    
    return visited

# ------------------------------------------------------------------
# Async dispatcher
# ------------------------------------------------------------------
async def crawl(start_url: str) -> None:
    """Manages the crawling process, dispatching tasks and SAVING INCREMENTALLY."""
    executor = ThreadPoolExecutor(max_workers=MAX_WORKERS)
    loop = asyncio.get_running_loop()

    # Ensure directory exists
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    # 1. LOAD VISITED URLS (Resume Logic)
    visited_urls = load_visited_urls(OUTPUT_FILE)
    
    tasks = set()
    pending_urls = {start_url}

    pbar = tqdm_asyncio(desc="Crawling Pages", unit="page")
    pbar.update(len(visited_urls)) # Visual update for skipped pages

    # Open CSV in append mode
    file_exists = OUTPUT_FILE.exists()
    mode = 'a' if file_exists else 'w'
    
    with open(OUTPUT_FILE, mode, newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        
        # Write header only if file is new
        if not file_exists:
            writer.writerow(["Product URL", "Feature", "Value"])

        while pending_urls or tasks:
            # Fill the pool
            while pending_urls and len(tasks) < MAX_WORKERS:
                url_to_scrape = pending_urls.pop()
                
                # Check if already done (Resume logic)
                if url_to_scrape in visited_urls:
                    continue

                visited_urls.add(url_to_scrape)
                task = loop.run_in_executor(executor, scrape_page_sync, url_to_scrape)
                tasks.add(task)
                pbar.total = len(visited_urls) + len(tasks)

            if not tasks:
                await asyncio.sleep(0.1)
                continue

            # Wait for at least one task
            done, tasks = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)

            for future in done:
                try:
                    result = await future
                    pbar.update(1)
                    
                    # 2. SAVE INCREMENTALLY
                    if result.scraped_rows:
                        writer.writerows(result.scraped_rows)
                        f.flush() # Ensure data is written to disk
                    
                    # Add new URLs
                    for new_url in result.next_urls:
                        if new_url not in visited_urls and new_url not in pending_urls:
                            pending_urls.add(new_url)
                            
                except Exception as e:
                    logging.error(f"Error processing task result: {e}")

    pbar.close()
    executor.shutdown(wait=True)

# ------------------------------------------------------------------
# Entry point 
# ------------------------------------------------------------------
async def main() -> None:
    """Main function."""
    start_time = time.time()
    
    # Initialize driver pool
    for _ in range(min(MAX_DRIVERS, 4)): 
        try:
            driver = create_driver_instance()
            CHROME_POOL.put_nowait(driver)
        except Exception as e:
            logging.error(f"Failed to create driver for pool: {e}")

    # Run crawler (now handles saving internally)
    await crawl(START_URL)

    # Cleanup drivers
    while True:
        try:
            driver = CHROME_POOL.get_nowait()
            driver.quit()
        except Empty:
            break
        except Exception:
            pass

    elapsed = time.time() - start_time
    logging.info(f"Done! Crawling finished in {elapsed:.2f}s.")

    # Pivot Data (Optional step at the end)
    # Wrapped in try/except because CSV might be large or empty
    try:
        if OUTPUT_FILE.exists():
            print("Generating Pivot Table (grouped_products_final.csv)...")
            df = pd.read_csv(OUTPUT_FILE)
            if not df.empty:
                # Group by URL to create pivot table
                pivoted_df = df.pivot_table(index="Product URL", columns="Feature", values="Value", aggfunc='first')
                pivoted_df.reset_index(inplace=True)
                pivoted_output_file = Path("data/grouped_products_final.csv")
                pivoted_df.to_csv(pivoted_output_file, index=False)
                logging.info(f"Pivoted data saved to '{pivoted_output_file}'.")
                print("Pivot Table created successfully.")
            else:
                print("CSV is empty, skipping pivot.")
    except Exception as e:
        logging.error(f"Could not pivot data. Error: {e}")
        print(f"Error pivoting data: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logging.info("Scraping cancelled by user.")
    except Exception as e:
        logging.critical(f"A critical error occurred: {e}", exc_info=True)