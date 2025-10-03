from selenium.webdriver.chrome.service import Service
from urllib.parse import urljoin
from selenium import webdriver
from bs4 import BeautifulSoup
import time
import csv
import threading
from concurrent.futures import ThreadPoolExecutor

# Setup ChromeDriver
service = Service(r"C:\\Users\\deyvid_barcelos\\Downloads\\chromedriver-win64\\chromedriver.exe")
driver = webdriver.Chrome(service=service)

# CSV output
output_file = "weg_products_recursive.csv"
csv_lock = threading.Lock()

# Track visited URLs to avoid loops
visited = set()
visited_lock = threading.Lock()

# Thread pool
executor = ThreadPoolExecutor(max_workers=5)  # Adjust number of threads as needed

def write_to_csv(row):
    with csv_lock:
        with open(output_file, "a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(row)

def scrape_page(url):
    with visited_lock:
        if url in visited:
            return
        visited.add(url)

    print(f"Visiting: {url}")
    try:
        driver.get(url)
        time.sleep(5)
        soup = BeautifulSoup(driver.page_source, 'html.parser')
    except Exception as e:
        print(f"Error loading {url}: {e}")
        return

    # Step 1: Check for "Ver produtos disponíveis" buttons
    product_list_links = soup.find_all('a', class_='btn btn-primary btn-sm btn-block', href=True)
    for btn in product_list_links:
        product_list_url = "https://www.weg.net" + btn['href']
        executor.submit(scrape_product_list, product_list_url)

    # Step 2: Check for product specs table
    specs_found = False
    for product in soup.find_all('div', class_='product-info-specs'):
        table = product.find('table', class_='table')
        if table:
            specs_found = True
            for tr in table.find_all('tr'):
                th = tr.find('th')
                td = tr.find('td')
                if th and td:
                    feature = th.get_text(strip=True)
                    value = td.get_text(strip=True)
                    write_to_csv([url, feature, value])
            print(f"Specs scraped from: {url}")

    # Step 3: If no specs, explore subcategories
    if not specs_found:
        for a in soup.find_all('a', class_='xtt-url-categories', href=True):
            next_url = urljoin("https://www.weg.net", a['href'])
            executor.submit(scrape_page, next_url)

def scrape_product_list(url):
    with visited_lock:
        if url in visited:
            return
        visited.add(url)

    print(f"Product list: {url}")
    try:
        driver.get(url)
        time.sleep(5)
        soup = BeautifulSoup(driver.page_source, 'html.parser')
    except Exception as e:
        print(f"Error loading product list {url}: {e}")
        return

    # Extract product links from table
    for td in soup.find_all('td', class_='product-code'):
        a = td.find('a', href=True)
        if a:
            product_url = "https://www.weg.net" + a['href']
            executor.submit(scrape_page, product_url)

# Initialize CSV with headers
with open(output_file, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["Product URL", "Feature", "Value"])

# Start from main category
start_url = "https://www.weg.net/catalog/weg/BR/pt/Tintas-e-Vernizes/c/TV"
executor.submit(scrape_page, start_url)

# Wait for all threads to finish
executor.shutdown(wait=True)
driver.quit()

print(f"\nDone! Data saved to '{output_file}'")