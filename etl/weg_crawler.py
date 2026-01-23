import asyncio
from concurrent.futures import ThreadPoolExecutor
import csv
import hashlib
import logging
import time
import json
import uuid
from pathlib import Path
from urllib.parse import urljoin, urlparse
from queue import Queue, Empty, Full

import pandas as pd
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import WebDriverException, TimeoutException
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from tqdm.asyncio import tqdm_asyncio

try:
    import aiomqtt
    MQTT_AVAILABLE = True
except ImportError:
    print("Warning: aiomqtt not installed. Running without MQTT support.")
    MQTT_AVAILABLE = False
    # Create a dummy class for when MQTT is not available
    class MockMqttClient:
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
        async def subscribe(self, *args): pass
        async def publish(self, *args): pass
        async def __aiter__(self): 
            while True: await asyncio.sleep(3600)  # Sleep forever
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, SecretStr
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, String, Text, JSON, Integer, ForeignKey   
import re
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.dialects.mysql import insert

load_dotenv()

# ============================================================
# =================== DATABASE & SETTINGS ====================
# ============================================================

class Settings(BaseSettings):
    DB_HOST: str = Field(default="db")
    DB_PORT: int = Field(default=3306)
    DB_USER: str = Field(default="root")
    DB_PASSWORD: SecretStr = Field(...)
    DB_NAME: str = Field(default="indumine_db")
    START_URL: str = Field(default="https://www.weg.net/institutional/BR/en/")
    
    # MQTT Configs
    MQTT_HOST: str = Field(default="mqtt-broker")
    MQTT_PORT: int = Field(default=1883)
    MQTT_USERNAME: str = Field(default="")
    MQTT_PASSWORD: str = Field(default="")

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra='ignore'
    )

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD.get_secret_value()}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"
        )

settings = Settings()
engine = create_engine(settings.DATABASE_URL)
Base = declarative_base()

class Categories(Base):
    __tablename__ = 'categories'
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(100), unique=True, nullable=False)

class Products(Base):
    __tablename__ = 'products'
    id = Column(String(50), primary_key=True)
    url = Column(Text, nullable=False)
    name = Column(String(255), nullable=False)
    
    # RELACIONAMENTO: Em vez de 'category' (string), usamos 'category_id' (int)
    category_id = Column(Integer, ForeignKey('categories.id'), nullable=True)
    
    description = Column(Text, nullable=True) # Alterado para Text conforme seu SQL
    specs = Column(JSON, nullable=True)
    images = Column(Text, nullable=True)
    scraped_at = Column(String(50), nullable=False)

def init_db():
    Base.metadata.create_all(engine)

# ============================================================
# ======================== CONFIGS ===========================
# ============================================================

BASE_URL = "https://www.weg.net"
WAIT_TIMEOUT = 30
MAX_WORKERS = 2
MAX_DRIVERS = 2

# Linux ChromeDriver path
CHROMEDRIVER_PATH = r"C:\chromedriver\chromedriver.exe"  

DATA_DIR = Path("data")
PRODUCT_URLS_FILE = DATA_DIR / "product_urls.csv"
OUTPUT_FILE = DATA_DIR / "weg_products_final.csv"

# Create directories before logging
DATA_DIR.mkdir(parents=True, exist_ok=True)
Path("logs").mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s: %(message)s",
    handlers=[
        logging.FileHandler("logs/weg_crawler.log"),
        logging.StreamHandler()
    ]
)

# ============================================================
# ===================== DRIVER POOL ==========================
# ============================================================

CHROME_POOL: Queue = Queue(maxsize=MAX_DRIVERS)


def create_driver_instance() -> webdriver.Chrome:
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage") 
    opts.add_argument("--log-level=3")
    opts.add_experimental_option("excludeSwitches", ["enable-logging"])
    opts.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    )

    service = Service(CHROMEDRIVER_PATH, service_args=["--read-timeout=300"])
    return webdriver.Chrome(service=service, options=opts)


# ============================================================
# ======================= HELPERS ============================
# ============================================================

def is_valid_language(url: str) -> bool:
    return "/BR/en/" in url

def normalize_url(url: str) -> str:
    parsed = urlparse(url)
    return parsed._replace(fragment="", query="").geturl()

def looks_like_product(url: str) -> bool:
    u = url.lower()
    return any(x in u for x in [
        "/product/", "/products/", "/produtos/", "/catalog/", 
        "/industrial/", "/motors/", "/drives/", "/automation/", "/p/"
    ])

# ============================================================
# ==================== CRAWLER LOGIC =========================
# ============================================================

def scrape_page_discovery(url: str) -> list[str]:
    driver = None
    soup = None

    try:
        driver = CHROME_POOL.get_nowait()
    except Empty:
        driver = create_driver_instance()

    try:
        driver.get(url)
        try:
            WebDriverWait(driver, WAIT_TIMEOUT).until(
                EC.presence_of_element_located(("css selector", "a[href]"))
            )
        except TimeoutException:
            title = driver.title
            logging.warning(f"[DISCOVERY] Timeout on {url}. Page Title: '{title}'")
            if "Access Denied" in title or "Pardon" in title:
                logging.error("BLOCKED: WEG has detected the crawler as a bot.")
        soup = BeautifulSoup(driver.page_source, "html.parser")

    finally:
        try:
            CHROME_POOL.put_nowait(driver)
        except Full:
            driver.quit()

    if not soup:
        return []

    links = set()
    for a in soup.select("a[href]"):
        href = a.get("href")
        if not href or href.startswith("#"):
            continue

        if any(ext in href.lower() for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']):
            continue
            
        full = normalize_url(urljoin(BASE_URL, href))
        if BASE_URL in full and is_valid_language(full):
            links.add(full)

    return list(links)

async def discovery_crawl(start_url: str, passes: int = 2) -> set[str]:
    executor = ThreadPoolExecutor(MAX_WORKERS)
    loop = asyncio.get_running_loop()

    discovered = set([start_url])

    for p in range(passes):
        logging.info(f"[DISCOVERY] Pass {p+1}")
        pending = set(discovered)
        visited = set()

        pbar = tqdm_asyncio(desc=f"Discovery pass {p+1}", unit="page", total=len(pending))

        while pending:
            batch = set()
            while pending and len(batch) < MAX_WORKERS:
                u = pending.pop()
                if u not in visited:
                    visited.add(u)
                    batch.add(loop.run_in_executor(executor, scrape_page_discovery, u))

            done, _ = await asyncio.wait(batch)
            for fut in done:
                pbar.update(1)
                try:
                    new_links = fut.result()
                    for l in new_links:
                        if l not in discovered:
                            discovered.add(l)
                            pending.add(l)
                    pbar.total = len(pending) + len(visited)
                except Exception as e:
                    logging.error(e)

        pbar.close()

    executor.shutdown(wait=True)
    return discovered

def save_product_urls(urls: set[str]):
    products = sorted({u for u in urls if looks_like_product(u)})

    with open(PRODUCT_URLS_FILE, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["product_url"])
        for u in products:
            w.writerow([u])

    logging.info(f"[DISCOVERY] Produtos encontrados: {len(products)}")
    print(f"Found {len(products)} product URLs")

def extract_product_data(soup: BeautifulSoup, url: str) -> list[list[str]]:
    """
    Extracts product data including images and flattens it 
    into a list of [URL, Feature, Value] rows for CSV storage.
    """
    rows = []
    
    def add(feature, value):
        if feature and value: 
            rows.append([url, feature, value])
    
    # Extract basic product info
    name = soup.select_one("h1.product-card-title")
    if name: 
        add("Product Name", name.get_text(strip=True))
    
    code = soup.select_one("small.product-card-info")
    if code: 
        add("Product Code", code.get_text(strip=True).replace("Product:", "").strip())
    
    desc = soup.select_one("div.xtt-product-description p")
    if desc: 
        add("Description", desc.get_text(strip=True))
    
    # Extract tables (features and details)
    for table in soup.select("div.product-info-specs table.table, table.table-striped"):
        for tr in table.select("tr"):
            th, td = tr.find("th"), tr.find("td")
            if th and td: 
                add(th.get_text(strip=True), td.get_text(strip=True))
    

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
    all_images = []
    
    # Extract from img tags
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
                    all_images.append(full_url)
                    seen_images.add(full_url)
    
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
                all_images.append(full_url)
                seen_images.add(full_url)
    
    for i, img_url in enumerate(all_images, 1):
        add(f"Image URL {i}", img_url)
    
    return rows

def scrape_product_page(url: str) -> list[list[str]]:
    driver = None
    try:
        try: 
            driver = CHROME_POOL.get_nowait()
        except Empty: 
            driver = create_driver_instance()
        
        driver.get(url)
        WebDriverWait(driver, WAIT_TIMEOUT).until(
            EC.presence_of_element_located(("css selector", "h1, table"))
        )
        return extract_product_data(BeautifulSoup(driver.page_source, "html.parser"), url)
    except Exception as e:
        logging.error(f"[PRODUCT] Error {url}: {e}")
        return []
    finally:
        if driver:
            try: 
                CHROME_POOL.put_nowait(driver)
            except Full: 
                driver.quit()

async def product_crawl(status_callback):
    if not PRODUCT_URLS_FILE.exists():
        raise FileNotFoundError(f"Product URLs file not found: {PRODUCT_URLS_FILE}")
    
    df = pd.read_csv(PRODUCT_URLS_FILE)
    urls = df["product_url"].tolist()
    total = len(urls)
    processed = 0
    
    executor = ThreadPoolExecutor(MAX_WORKERS)
    loop = asyncio.get_running_loop()

    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Product URL", "Feature", "Value"])
        
        tasks = set()
        
        for u in urls:
            if len(tasks) >= MAX_WORKERS:
                done, tasks = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
                for fut in done:
                    rows = fut.result()
                    if rows: 
                        writer.writerows(rows)
                        f.flush()
                    processed += 1
                    await status_callback(processed, total)
            
            tasks.add(loop.run_in_executor(executor, scrape_product_page, u))

        if tasks:
            done, _ = await asyncio.wait(tasks)
            for fut in done:
                rows = fut.result()
                if rows: 
                    writer.writerows(rows)
                processed += 1
                await status_callback(processed, total)
    
    executor.shutdown(wait=True)
    return total

# ============================================================
# ================= LÓGICA DE PROCESSAMENTO ==================
# ============================================================

def simple_slugify(text):
    """Cria um slug simples para a categoria"""
    text = text.lower().strip()
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    return re.sub(r'[\s-]+', '-', text)

def get_or_create_category_id(session, category_name):
    """
    Verifica se a categoria existe. Se não, cria. Retorna o ID.
    """
    if not category_name:
        category_name = "Geral"
        
    category = session.query(Categories).filter_by(name=category_name).first()
    if category:
        return category.id
    
    try:
        new_slug = simple_slugify(category_name)
        new_category = Categories(name=category_name, slug=new_slug)
        session.add(new_category)
        session.commit()
        return new_category.id
    except Exception as e:
        session.rollback()
        category = session.query(Categories).filter_by(name=category_name).first()
        if category:
            return category.id
        return None

def process_and_upsert():
    if not OUTPUT_FILE.exists():
        logging.warning("Output file not found.")
        return

    raw_data = pd.read_csv(OUTPUT_FILE, sep=',', encoding='utf-8')
    grouped = raw_data.groupby('Product URL')
    
    # Inicia sessão para gerir categorias
    Session = sessionmaker(bind=engine)
    session = Session()

    products_to_insert = []
    
    logging.info("Processando categorias e produtos...")

    for url, group in grouped:
        specs = {}
        for _, row in group.iterrows():
            if row['Feature'] and 'Image URL' not in row['Feature']:
                specs[row['Feature']] = row['Value']
        
        # Extrair imagens
        image_rows = group[group['Feature'].str.contains('Image URL', na=False)]
        images = image_rows['Value'].tolist() if not image_rows.empty else []
        
        # --- Lógica de Extração da Categoria ---
        category_name = "Geral"
        try:
            parts = url.strip('/').split('/')
            if len(parts) > 2:
                if 'en' in parts:
                    idx = parts.index('en')
                    if idx + 1 < len(parts):
                        category_name = parts[idx+1].replace('-', ' ').title()
                else:
                    category_name = parts[-2].replace('-', ' ').title()
        except Exception:
            pass
        
        # Obter ID da Categoria (Relacional)
        cat_id = get_or_create_category_id(session, category_name)

        # Criar registo do produto
        record = {
            'id': specs.get('Product Code', hashlib.md5(url.encode()).hexdigest()[:20]),
            'url': url,
            'name': specs.get('Product Name', 'Produto sem Nome'),
            'category_id': cat_id,  # Usa o ID, não o nome
            'description': specs.get('Description', ''),
            'specs': json.dumps(specs) if specs else '{}',
            'images': json.dumps(images) if images else '[]',
            'scraped_at': pd.Timestamp.now().isoformat()
        }
        products_to_insert.append(record)

    session.close() # Fecha a sessão usada para categorias

    # Bulk Upsert dos Produtos
    if products_to_insert:
        df_products = pd.DataFrame(products_to_insert)
        mysql_upsert(Products, engine, df_products)
    else:
        logging.warning("Nenhum produto processado.")

def mysql_upsert(table_class, engine, df):
    df_clean = df.where(pd.notnull(df), None)
    records = df_clean.to_dict(orient='records')
    for r in records:
        if isinstance(r['specs'], dict): 
            r['specs'] = json.dumps(r['specs'])
        if isinstance(r['description'], (dict, list)): 
            r['description'] = json.dumps(r['description'])
    
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        stmt = insert(table_class).values(records)
        update_dict = {c.name: stmt.inserted[c.name] for c in table_class.__table__.columns if not c.primary_key}
        session.execute(stmt.on_duplicate_key_update(update_dict))
        session.commit()
        logging.info(f"Upserted {len(records)} records to database")
    except Exception as e:
        session.rollback()
        logging.error(f"DB Error: {e}")
    finally:
        session.close()

# ============================================================
# ================ COMMAND LINE INTERFACE ====================
# ============================================================

async def run_standalone_mode(job_type="full"):
    """Run the crawler in standalone mode without MQTT"""
    print("=" * 60)
    print(f"WEG CRAWLER - STANDALONE MODE")
    print(f"Job: {job_type}")
    print("=" * 60)
    
    start_time = time.time()
    
    # Create logs directory if it doesn't exist
    Path("logs").mkdir(exist_ok=True)
    
    # Initialize database
    print("\n[1/4] Initializing database...")
    init_db()
    
    # Initialize drivers
    print("[2/4] Initializing Chrome drivers...")
    for _ in range(min(4, MAX_DRIVERS)):
        try: 
            CHROME_POOL.put_nowait(create_driver_instance())
        except Exception as e:
            print(f"Warning: Failed to initialize driver: {e}")
    
    if job_type in ["discovery", "full"]:
        print("[3/4] Running discovery crawl...")
        urls = await discovery_crawl(settings.START_URL, passes=1)
        save_product_urls(urls)
        print(f"Discovery complete: Found {len(urls)} URLs")
    
    if job_type in ["product", "full"]:
        if not PRODUCT_URLS_FILE.exists():
            print("Error: Product URLs file not found. Run discovery first.")
            return
        
        print("[4/4] Scraping product data...")
        
        async def progress_callback(processed, total):
            print(f"Progress: {processed}/{total} ({processed/total*100:.1f}%)", end='\r')
        
        total = await product_crawl(progress_callback)
        print(f"\nScraping complete: {total} products")
        
        # Process and save to database
        print("\nProcessing and saving to database...")
        process_and_upsert()
    
    # Cleanup
    print("\nCleaning up...")
    while not CHROME_POOL.empty():
        try: 
            driver = CHROME_POOL.get_nowait()
            driver.quit()
        except:
            pass
    
    elapsed = time.time() - start_time
    print(f"\n✅ Done! Total time: {elapsed:.2f}s")

# ============================================================
# =================== MQTT CONTROL MANAGER ===================
# ============================================================

class CrawlerManager:
    def __init__(self):
        self.state = "idle"
        self.job_id = None
        self.client = None
        self.topic_command = "indumine/crawler/command"
        self.topic_status = "indumine/crawler/status"
        self.task = None

    async def publish_status(self, processed=0, total=0, message=""):
        if self.client is None:
            return
            
        payload = {
            "job_id": self.job_id,
            "state": self.state,
            "processed": processed,
            "total_estimated": total,
            "message": message,
            "timestamp": pd.Timestamp.now().isoformat()
        }
        
        try:
            await self.client.publish(self.topic_status, json.dumps(payload))
            logging.debug(f"Published status: {payload}")
        except Exception as e:
            logging.error(f"MQTT Publish Error: {e}")

    async def handle_command(self, message):
        try:
            data = json.loads(message.payload.decode())
            command = data.get("command")
            
            if command == "start":
                if self.state == "running":
                    await self.publish_status(message="Ignored: Already running")
                    logging.warning("Received start command but already running")
                    return
                
                self.job_id = data.get("job_id", str(uuid.uuid4())[:8])
                mode = data.get("mode", "product")
                
                if self.task and not self.task.done():
                    self.task.cancel()
                
                self.task = asyncio.create_task(self.execute_job(mode))
                logging.info(f"Started job {self.job_id} in mode {mode}")
                
            elif command == "stop":
                if self.state == "running" and self.task:
                    self.task.cancel()
                    self.state = "stopped"
                    await self.publish_status(message="Job stopped by command")
                    logging.info("Job stopped by command")
                    
        except json.JSONDecodeError as e:
            logging.error(f"Invalid JSON in MQTT message: {e}")
            await self.publish_status(message=f"Invalid command format: {str(e)}")
        except Exception as e:
            logging.error(f"MQTT Process Error: {e}")
            await self.publish_status(message=f"Command error: {str(e)}")

    async def execute_job(self, mode):
        self.state = "running"
        logging.info(f"Executing job in {mode} mode")
        
        try:
            await self.publish_status(message=f"Starting mode: {mode}")
            
            init_db()
            
            # Initialize drivers
            logging.info("Initializing Chrome drivers...")
            for _ in range(min(4, MAX_DRIVERS)):
                try: 
                    CHROME_POOL.put_nowait(create_driver_instance())
                except Exception as e:
                    logging.warning(f"Failed to initialize driver: {e}")
            
            logging.info(f"Chrome pool size: {CHROME_POOL.qsize()}")

            if mode == "discovery":
                logging.info("Starting discovery crawl...")
                urls = await discovery_crawl(settings.START_URL, passes=1)
                save_product_urls(urls)
                await self.publish_status(message=f"Discovery finished. Found {len(urls)} URLs")
                logging.info(f"Discovery finished. Found {len(urls)} URLs")
                
            elif mode == "product":
                if not PRODUCT_URLS_FILE.exists():
                    error_msg = f"Product URLs file not found: {PRODUCT_URLS_FILE}. Run discovery mode first."
                    logging.error(error_msg)
                    raise FileNotFoundError(error_msg)
                
                logging.info("Starting product crawl...")
                total = await product_crawl(self.publish_status)
                await self.publish_status(message=f"Scraping complete. Processing data...")
                logging.info("Processing and upserting data...")
                process_and_upsert()
                await self.publish_status(message=f"Data processed and upserted to database")
            
            self.state = "idle"
            await self.publish_status(message="Job completed successfully")
            logging.info(f"Job {self.job_id} completed successfully")
            
        except asyncio.CancelledError:
            self.state = "cancelled"
            await self.publish_status(message="Job cancelled")
            logging.info("Job cancelled")
            raise
        except Exception as e:
            self.state = "error"
            error_msg = f"Fatal error: {str(e)}"
            await self.publish_status(message=error_msg)
            logging.error(f"Job failed: {e}", exc_info=True)
        finally:
            # Cleanup
            logging.info("Cleaning up Chrome drivers...")
            while not CHROME_POOL.empty():
                try: 
                    driver = CHROME_POOL.get_nowait()
                    driver.quit()
                except Exception as e:
                    logging.warning(f"Error cleaning up driver: {e}")
            self.job_id = None

    async def run(self):
        """Main async run method"""
        logging.info("Starting async MQTT crawler manager...")
        logging.info(f"MQTT Host: {settings.MQTT_HOST}:{settings.MQTT_PORT}")
        
        reconnect_interval = 5  # seconds
        
        while True:
            try:
                client_options = {
                    "hostname": settings.MQTT_HOST,
                    "port": settings.MQTT_PORT,
                }
                
                if settings.MQTT_USERNAME:
                    client_options["username"] = settings.MQTT_USERNAME
                if settings.MQTT_PASSWORD:
                    client_options["password"] = settings.MQTT_PASSWORD
                
                async with aiomqtt.Client(**client_options) as client:
                    self.client = client
                    
                    # Subscribe to command topic
                    await client.subscribe(self.topic_command)
                    logging.info(f"Subscribed to {self.topic_command}")
                    
                    # Publish initial status
                    await self.publish_status(message="Crawler started and ready")
                    
                    # Process incoming messages
                    async for message in client.messages:
                        logging.info(f"Received message on topic: {message.topic} | Payload: {message.payload.decode()}")
                        if str(message.topic) == self.topic_command:
                            await self.handle_command(message)
                            
            except aiomqtt.MqttError as e:
                logging.error(f"MQTT connection error: {e}. Reconnecting in {reconnect_interval} seconds...")
                self.state = "disconnected"
                await asyncio.sleep(reconnect_interval)
            except Exception as e:
                logging.error(f"Unexpected error: {e}", exc_info=True)
                await asyncio.sleep(reconnect_interval)

async def main_mqtt():
    """Main async entry point for MQTT mode"""
    Path("logs").mkdir(exist_ok=True)
    
    manager = CrawlerManager()
    await manager.run()


if __name__ == "__main__":
    import sys
    import asyncio
    import argparse
    
    
    parser = argparse.ArgumentParser(description='WEG Web Crawler')
    parser.add_argument('--no-mqtt', action='store_true', 
                       help='Run in standalone mode without MQTT')
    parser.add_argument('--job', choices=['discovery', 'product', 'full'], default='full',
                       help='Job type: discovery (find URLs), product (scrape data), full (both)')
    parser.add_argument('--mqtt-host', type=str, 
                       help='MQTT broker host (default: mqtt-broker)')
    parser.add_argument('--mqtt-port', type=int, 
                       help='MQTT broker port (default: 1883)')
    
    args = parser.parse_args()
    
    # Update settings if command-line args provided
    if args.mqtt_host:
        settings.MQTT_HOST = args.mqtt_host
    if args.mqtt_port:
        settings.MQTT_PORT = args.mqtt_port
    
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    if args.no_mqtt:
        # Run in standalone mode without MQTT
        print("Running in standalone mode (no MQTT)...")
        asyncio.run(run_standalone_mode(args.job))
    else:
        # Run with MQTT (default)
        print(f"Running with MQTT (host: {settings.MQTT_HOST}:{settings.MQTT_PORT})...")
        asyncio.run(main_mqtt())