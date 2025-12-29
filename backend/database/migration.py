# database/migration.py
"""
Migration script to transfer CSV data to MongoDB with sparse modeling.
"""
import asyncio
import pandas as pd
import numpy as np
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from bson import ObjectId
import logging
import json
from urllib.parse import unquote
import re
import os
import sys

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from config import settings
except ImportError:
    # Fallback to default settings
    class Settings:
        mongodb_url = "mongodb://localhost:27017"
        mongodb_db_name = "weg_products"
    
    settings = Settings()

logger = logging.getLogger(__name__)

# Import the CSV processing functions
def extract_id_and_name_from_url(url):
    """Extrai ID e Nome da URL do produto"""
    if not isinstance(url, str):
        return None, "Produto Sem Nome"
    
    try:
        parts = url.split('/p/')
        if len(parts) > 1:
            prod_id = int(parts[1].split('/')[0])
            name_part = parts[0].split('/')[-2] or parts[0].split('/')[-1]
            clean_name = unquote(name_part).replace('-', ' ').strip()
            return prod_id, clean_name
        return None, "Produto Sem Nome"
    except:
        return None, "Produto Sem Nome"

def extract_category(url):
    """Extrai nome da categoria da URL"""
    try:
        if isinstance(url, str) and '/en/' in url:
            parts = url.split('/en/')
            if len(parts) > 1:
                category_part = parts[1].split('/')[0]
                decoded = unquote(category_part)
                formatted = decoded.replace('-', ' ').title()
                return formatted
        return "Sem Categoria"
    except:
        return "Sem Categoria"

def parse_specs(specs_str):
    """Parse especificações"""
    try:
        if pd.isna(specs_str) or specs_str == '':
            return {}
        if isinstance(specs_str, dict):
            return specs_str
        if isinstance(specs_str, str):
            if specs_str.startswith('{') and specs_str.endswith('}'):
                try:
                    return json.loads(specs_str)
                except:
                    try:
                        return json.loads(specs_str.replace("'", '"'))
                    except:
                        return {"descrição": specs_str}
            return {"informação": specs_str}
    except Exception as e:
        logger.error(f"Erro ao parsear specs: {e}")
        return {}

class DataMigrator:
    def __init__(self, csv_path: str):
        self.csv_path = csv_path
        self.df = None
        self.actual_columns = {}
        self.category_cache = {}  # name -> ObjectId
        
    async def connect_to_db(self):
        """Connect to MongoDB"""
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            client = AsyncIOMotorClient(settings.mongodb_url)
            await client.admin.command('ping')
            db = client[settings.mongodb_db_name]
            logger.info("✅ Connected to MongoDB")
            return db
        except Exception as e:
            logger.error(f"❌ Failed to connect to MongoDB: {e}")
            raise
    
    async def create_indexes(self, db):
        """Create optimized indexes for performance"""
        products = db.products
        categories = db.categories
        
        # Drop existing indexes
        await products.drop_indexes()
        await categories.drop_indexes()
        
        # Product indexes
        await products.create_index("category_id")
        await products.create_index([("allowed_roles", 1)])
        await products.create_index([("popularity", -1)])
        await products.create_index([("category_id", 1), ("popularity", -1)])
        
        # Create text index for search
        await products.create_index([
            ("name", "text"),
            ("description", "text"),
            ("key_features", "text")
        ])
        
        # Category indexes
        await categories.create_index("name", unique=True)
        await categories.create_index([("allowed_roles", 1)])
        await categories.create_index([("product_count", -1)])
        
        logger.info("✅ Created optimized indexes")
    
    def load_and_preprocess_csv(self):
        """Load CSV with pre-cleaning (No-Nulls rule)"""
        logger.info(f"📥 Loading CSV from {self.csv_path}")
        
        try:
            if not os.path.exists(self.csv_path):
                logger.error(f"❌ CSV file not found: {self.csv_path}")
                # Create dummy data for testing
                return self.create_dummy_data()
            
            df = pd.read_csv(self.csv_path, on_bad_lines='skip', low_memory=False)
            logger.info(f"✅ Loaded {len(df)} rows")
            
            # Pre-cleaning: Replace NaN with None for MongoDB sparse storage
            df = df.replace({np.nan: None})
            
            # Map columns
            column_mapping = {
                'product_name': ['Product Name', 'Product', 'Name', 'product', 'nome'],
                'product_family': ['Product Family', 'Family', 'Familia', 'product_family'],
                'key_features': ['key_features', 'Key Features', 'Features', 'Descrição', 'Description'],
                'main_specs': ['main_specs', 'Main Specs', 'Specifications', 'Especificações'],
                'dimension_specs': ['dimension_specs', 'Dimension Specs', 'Dimensions', 'Dimensões']
            }
            
            def find_column(possible_names):
                for name in possible_names:
                    if name in df.columns:
                        return name
                return None
            
            for standard_name, possible_names in column_mapping.items():
                actual_column = find_column(possible_names)
                if actual_column:
                    self.actual_columns[standard_name] = actual_column
                else:
                    self.actual_columns[standard_name] = None
            
            # Extract category from URL
            if 'Product URL' in df.columns:
                df["category_name"] = df["Product URL"].apply(extract_category)
            else:
                df["category_name"] = "Categoria Padrão"
            
            # Generate product ID if not exists
            if 'product_id' not in df.columns:
                df["product_id"] = (df.index + 1).astype("Int64")
            
            self.df = df
            logger.info(f"✅ Preprocessing complete. {len(df)} rows ready for migration")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to load CSV: {e}")
            # Create dummy data as fallback
            return self.create_dummy_data()
    
    def create_dummy_data(self):
        """Create dummy data for testing"""
        logger.info("📝 Creating dummy data for testing...")
        
        # Create a small DataFrame with dummy data
        data = {
            'Product URL': [
                'https://www.weg.net/en/motors/product1',
                'https://www.weg.net/en/drives/product2',
                'https://www.weg.net/en/softstarters/product3'
            ],
            'Product Name': ['Motor W22', 'Drive CFW11', 'Softstarter SSW07'],
            'Product Family': ['Motors', 'Drives', 'Softstarters'],
            'Power': ['10kW', '15kW', '20kW'],
            'Voltage': ['220V', '380V', '440V'],
            'Weight': ['100kg', '50kg', '75kg'],
            'main_specs': [
                '{"Potência": "10kW", "Tensão": "220V"}',
                '{"Potência": "15kW", "Tensão": "380V"}',
                '{"Potência": "20kW", "Tensão": "440V"}'
            ],
            'dimension_specs': [
                '{"Altura": "500mm", "Largura": "300mm"}',
                '{"Altura": "400mm", "Largura": "200mm"}',
                '{"Altura": "450mm", "Largura": "250mm"}'
            ],
            'key_features': [
                'Alta eficiência, baixo consumo',
                'Controle preciso, fácil configuração',
                'Partida suave, proteção do motor'
            ]
        }
        
        df = pd.DataFrame(data)
        df["category_name"] = df["Product URL"].apply(extract_category)
        df["product_id"] = (df.index + 1).astype("Int64")
        
        self.actual_columns = {
            'product_name': 'Product Name',
            'product_family': 'Product Family',
            'key_features': 'key_features',
            'main_specs': 'main_specs',
            'dimension_specs': 'dimension_specs'
        }
        
        self.df = df
        logger.info("✅ Created dummy data with 3 products")
        return True
    
    def extract_technical_specs(self, row: pd.Series) -> Dict[str, Any]:
        """Extract only non-empty technical specs (Attribute Pattern)"""
        specs = {}
        
        # Define possible technical columns
        technical_columns = [
            'Voltage', 'Rated voltage', 'Operating voltage',
            'Power', 'Rated power', 'Output',
            'Frame', 'Casing',
            'Frequency',
            'Number of Poles', 'Number of poles',
            'Synchronous speed', 'Rated speed', 'Rotation',
            'Degree of Protection', 'Degree of protection', 'Protection degree',
            'Efficiency @ 100%', 'Efficiency',
            'Rated current', 'Operating current',
            'Weight', 'Approx. weight'
        ]
        
        for col in technical_columns:
            if col in row and row[col] is not None and str(row[col]).strip() != '':
                specs[col] = str(row[col])
        
        return specs
    
    def get_product_name(self, row: pd.Series) -> str:
        """Get product name with fallback"""
        if self.actual_columns.get('product_name'):
            col_name = self.actual_columns['product_name']
            if col_name in row and row[col_name]:
                return str(row[col_name])
        
        # Try to extract from URL
        if 'Product URL' in row and row['Product URL']:
            _, name = extract_id_and_name_from_url(row['Product URL'])
            if name != "Produto Sem Nome":
                return name
        
        return f"Produto {row.get('product_id', '')}"
    
    def get_category_allowed_roles(self, category_name: str) -> List[str]:
        """Determine which roles can access this category"""
        # Define role-based access for categories
        ROLE_CATEGORIES = {
            "admin": ["Electric Motors", "Drives", "Softstarters", "Panels", "Generators", "Transformers"],
            "engineer": ["Electric Motors", "Drives", "Softstarters"],
            "sales": ["Electric Motors", "Drives", "Panels"],
            "guest": ["Electric Motors"]
        }
        
        # Map Portuguese names to English
        name_mapping = {
            "Motores": "Electric Motors",
            "Drives": "Drives",
            "Softstarters": "Softstarters",
            "Painéis": "Panels",
            "Geradores": "Generators",
            "Transformadores": "Transformers"
        }
        
        # Try to map the category name
        english_name = name_mapping.get(category_name, category_name)
        
        allowed_roles = []
        for role, categories in ROLE_CATEGORIES.items():
            if english_name in categories:
                allowed_roles.append(role)
        
        # Everyone gets at least guest access
        if not allowed_roles or "guest" not in allowed_roles:
            allowed_roles.append("guest")
        
        return allowed_roles
    
    async def migrate_categories(self, db) -> Dict[str, ObjectId]:
        """Migrate categories collection"""
        categories_col = db.categories
        
        # Clear existing categories
        await categories_col.delete_many({})
        
        # Get unique categories
        unique_categories = self.df["category_name"].dropna().unique()
        logger.info(f"📊 Found {len(unique_categories)} unique categories")
        
        category_cache = {}
        
        for i, category_name in enumerate(unique_categories):
            # Create category document
            allowed_roles = self.get_category_allowed_roles(category_name)
            
            category_doc = {
                "name": category_name,
                "description": f"Produtos na categoria: {category_name}",
                "photo": f"/assets/categories/cat{(i % 6) + 1}.jpg",
                "product_count": 0,  # Will be updated after products migration
                "status": "active",
                "allowed_roles": allowed_roles,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            
            result = await categories_col.insert_one(category_doc)
            category_cache[category_name] = result.inserted_id
            
            logger.info(f"✅ Created category: {category_name} (ID: {result.inserted_id})")
        
        self.category_cache = category_cache
        return category_cache
    
    async def migrate_products(self, db, category_cache: Dict[str, ObjectId]):
        """Migrate products collection with sparse modeling"""
        products_col = db.products
        
        # Clear existing products
        await products_col.delete_many({})
        
        products_to_insert = []
        category_counts = {}
        
        for idx, row in self.df.iterrows():
            try:
                # Extract basic info
                product_id = int(row.get('product_id', idx + 100000))
                product_name = self.get_product_name(row)
                category_name = row.get("category_name", "Sem Categoria")
                
                # Get category reference
                category_id = category_cache.get(category_name)
                if not category_id:
                    logger.warning(f"Category '{category_name}' not found for product {product_name}")
                    continue
                
                # Count for category stats
                category_counts[category_name] = category_counts.get(category_name, 0) + 1
                
                # Extract only existing technical specs (No-Nulls Rule)
                technical_specs = self.extract_technical_specs(row)
                
                # Parse main and dimension specs if they exist
                main_specs = {}
                if self.actual_columns.get('main_specs'):
                    col_name = self.actual_columns['main_specs']
                    if col_name in row and row[col_name]:
                        main_specs = parse_specs(row[col_name])
                
                dimension_specs = {}
                if self.actual_columns.get('dimension_specs'):
                    col_name = self.actual_columns['dimension_specs']
                    if col_name in row and row[col_name]:
                        dimension_specs = parse_specs(row[col_name])
                
                # Get key features
                key_features = ""
                if self.actual_columns.get('key_features'):
                    col_name = self.actual_columns['key_features']
                    if col_name in row and row[col_name]:
                        key_features = str(row[col_name])
                
                # Determine allowed roles based on category
                allowed_roles = self.get_category_allowed_roles(category_name)
                
                # Create product document with only existing fields (Sparse Modeling)
                product_doc = {
                    "original_id": product_id,
                    "name": product_name,
                    "category_id": category_id,
                    "category_name": category_name,
                    "description": key_features[:200] + "..." if len(key_features) > 200 else key_features,
                    "photo": f"/assets/products/prod{(product_id % 6) + 1}.jpg",
                    "status": "active",
                    "key_features": key_features,
                    "url": row.get('Product URL'),
                    "allowed_roles": allowed_roles,
                    "popularity": 0,
                    "technical_specs": technical_specs if technical_specs else None,
                    "main_specs": main_specs if main_specs else None,
                    "dimension_specs": dimension_specs if dimension_specs else None,
                    "created_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc)
                }
                
                # Remove None values for true sparse storage
                product_doc = {k: v for k, v in product_doc.items() if v is not None}
                
                products_to_insert.append(product_doc)
                
                # Log progress
                if len(products_to_insert) % 100 == 0:
                    logger.info(f"📦 Processed {len(products_to_insert)} products")
                    
            except Exception as e:
                logger.error(f"❌ Error processing row {idx}: {e}")
                continue
        
        # Insert all products at once
        if products_to_insert:
            await products_col.insert_many(products_to_insert)
            logger.info(f"📦 Inserted {len(products_to_insert)} products")
        
        # Update category counts
        categories_col = db.categories
        for category_name, count in category_counts.items():
            category_id = category_cache.get(category_name)
            if category_id:
                await categories_col.update_one(
                    {"_id": category_id},
                    {"$set": {"product_count": count, "updated_at": datetime.now(timezone.utc)}}
                )
        
        return len(products_to_insert)
    
    async def run_migration(self):
        """Main migration function"""
        logger.info("🚀 Starting MongoDB data migration...")
        
        try:
            # Connect to database
            db = await self.connect_to_db()
            
            # Load and preprocess CSV
            if not self.load_and_preprocess_csv():
                return False
            
            # Create indexes
            await self.create_indexes(db)
            
            # Migrate categories
            logger.info("📁 Migrating categories...")
            category_cache = await self.migrate_categories(db)
            
            # Migrate products
            logger.info("📦 Migrating products...")
            product_count = await self.migrate_products(db, category_cache)
            
            # Final statistics
            total_products = await db.products.count_documents({})
            total_categories = await db.categories.count_documents({})
            
            logger.info(f"✅ Migration completed successfully!")
            logger.info(f"📊 Statistics:")
            logger.info(f"  - Products: {total_products}")
            logger.info(f"  - Categories: {total_categories}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Migration failed: {e}")
            import traceback
            traceback.print_exc()
            return False

def find_csv_file():
    """Try to find the CSV file in common locations"""
    possible_paths = [
        "data/grouped_products_final.csv",
        "../data/grouped_products_final.csv",
        "../../data/grouped_products_final.csv",
        "grouped_products_final.csv"
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            return os.path.abspath(path)
    
    return None

# Main execution
if __name__ == "__main__":
    import sys
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler('migration.log')
        ]
    )
    
    # Get CSV path from command line or find it
    if len(sys.argv) > 1:
        csv_path = sys.argv[1]
    else:
        csv_path = find_csv_file()
    
    if not csv_path:
        logger.warning("❌ CSV file not found. Using dummy data.")
        BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        csv_path = os.path.join(BASE_DIR, "data", "grouped_products_final.csv")
    
    logger.info(f"📄 Using CSV file: {csv_path}")
    
    # Run migration
    migrator = DataMigrator(csv_path)
    
    async def main():
        success = await migrator.run_migration()
        if success:
            logger.info("✅ Migration completed successfully!")
            print("\n✅ Migration completed successfully!")
            print("📊 You can now run the FastAPI application:")
            print("   python main.py")
        else:
            logger.error("❌ Migration failed!")
            print("\n❌ Migration failed! Check migration.log for details.")
            sys.exit(1)
    
    # Run the async main function
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Migration interrupted by user")
        print("\n⚠️ Migration interrupted")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)