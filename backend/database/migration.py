# database/migration.py
"""
Migration script to transfer CSV data to MongoDB following the legacy API structure.
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

# Import the CSV processing functions - adapted from legacy API
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
        return {}
    except Exception as e:
        logger.error(f"Erro ao parsear specs: {e}")
        return {}

def process_specs(row):
    """Monta dicionário de especificações no formato da API antiga"""
    specs = {}
    mapping = {
        "Tensão (Voltage)": ["Voltage", "Rated voltage", "Operating voltage"],
        "Potência": ["Power", "Rated power", "Output"],
        "Carcaça (Frame)": ["Frame", "Casing"],
        "Frequência": ["Frequency"],
        "Polos": ["Number of Poles", "Number of poles"],
        "Rotação": ["Synchronous speed", "Rated speed", "Rotation"],
        "Proteção": ["Degree of Protection", "Degree of protection", "Protection degree"],
        "Eficiência": ["Efficiency @ 100%", "Efficiency"],
        "Corrente": ["Rated current", "Operating current"],
        "Peso": ["Weight", "Approx. weight"]
    }
    for label, possible_cols in mapping.items():
        for col in possible_cols:
            if col in row and row[col] is not None and str(row[col]).strip() != '':
                specs[label] = str(row[col])
                break
    return specs

class DataMigrator:
    def __init__(self, csv_path: str):
        self.csv_path = csv_path
        self.df = None
        self.actual_columns = {}
        self.category_cache = {}  # name -> {id, mongo_id}

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
        await products.create_index("category")
        await products.create_index("final_category_name")
        await products.create_index("id")
        await products.create_index([("name", "text"), ("description", "text"), ("key_features", "text")])
        
        # Category indexes
        await categories.create_index("id")
        await categories.create_index("name", unique=True)
        
        logger.info("✅ Created optimized indexes")

    def load_and_preprocess_csv(self):
        """Load CSV with pre-cleaning following legacy API structure"""
        logger.info(f"📥 Loading CSV from {self.csv_path}")
        try:
            if not os.path.exists(self.csv_path):
                logger.error(f"❌ CSV file not found: {self.csv_path}")
                # Create dummy data for testing
                return self.create_dummy_data()
                
            df = pd.read_csv(self.csv_path, on_bad_lines='skip', low_memory=False)
            logger.info(f"✅ Loaded {len(df)} rows")
            
            # Pre-cleaning: Replace NaN with empty string to match legacy API behavior
            df = df.fillna('')
            
            # Map columns - same as legacy API
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
            
            # Extract category from URL - same as legacy API
            if 'Product URL' in df.columns:
                df["final_category_name"] = df["Product URL"].apply(extract_category)
            else:
                df["final_category_name"] = "Categoria Padrão"
            
            # Generate product ID if not exists - match legacy API format
            if 'product_id' not in df.columns:
                # Try to extract ID from URL first like the legacy API
                if 'Product URL' in df.columns:
                    df["id"] = df["Product URL"].apply(lambda x: extract_id_and_name_from_url(x)[0])
                    # Fill missing IDs with sequential values
                    missing_ids = df["id"].isna() | df["id"].isnull()
                    df.loc[missing_ids, "id"] = range(100000, 100000 + missing_ids.sum())
                    df["id"] = df["id"].astype(int)
                else:
                    df["id"] = (df.index + 100000).astype(int)
            
            # Generate product names if missing - match legacy API format
            df["name"] = df.apply(lambda row: extract_id_and_name_from_url(row.get('Product URL', ''))[1] 
                                 if 'Product URL' in row and pd.notna(row['Product URL']) 
                                 else f"Produto {row['id']}", axis=1)
            
            # Get key features with fallback - match legacy API format
            def get_key_features(row):
                if self.actual_columns.get('key_features'):
                    col_name = self.actual_columns['key_features']
                    if col_name in row and row[col_name]:
                        return str(row[col_name])
                return f"Produto {row['id']}"
                
            df["key_features"] = df.apply(get_key_features, axis=1)
            df["description"] = df["key_features"]
            
            self.df = df
            logger.info(f"✅ Preprocessing complete. {len(df)} rows ready for migration")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to load CSV: {e}")
            # Create dummy data as fallback
            return self.create_dummy_data()

    def create_dummy_data(self):
        """Create dummy data matching legacy API structure"""
        logger.info("📝 Creating dummy data for testing...")
        data = {
            'Product URL': [
                'https://www.weg.net/en/motors/p/12345/motor-w22',
                'https://www.weg.net/en/drives/p/67890/drive-cfw11',
                'https://www.weg.net/en/softstarters/p/54321/softstarter-ssw07'
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
        df["final_category_name"] = df["Product URL"].apply(extract_category)
        
        # Set IDs like legacy API
        df["id"] = [1, 2, 3]
        df["name"] = df["Product Name"]
        df["description"] = df["key_features"]
        
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

    async def migrate_categories(self, db) -> Dict[str, Dict]:
        """Migrate categories collection following legacy API structure"""
        categories_col = db.categories
        # Clear existing categories
        await categories_col.delete_many({})
        
        # Get unique categories - same as legacy API
        unique_categories = self.df["final_category_name"].dropna().unique()
        logger.info(f"📊 Found {len(unique_categories)} unique categories")
        
        category_cache = {}
        for i, category_name in enumerate(unique_categories):
            # Create category document matching legacy API structure
            category_doc = {
                "id": i + 1,  # Numeric ID like legacy API
                "name": category_name,
                "description": f"Produtos na categoria: {category_name}",
                "photo": f"../src/assets/dummyPhoto{(i % 6) + 1}.png",  # Same path format as legacy API
                "product_count": 0,  # Will be updated after products migration
                "status": "Ativo"  # Same status value as legacy API
            }
            
            result = await categories_col.insert_one(category_doc)
            # Store both the numeric ID and MongoDB ID for reference
            category_cache[category_name] = {
                "id": i + 1,
                "mongo_id": result.inserted_id
            }
            logger.info(f"✅ Created category: {category_name} (ID: {i+1})")
        
        self.category_cache = category_cache
        return category_cache

    async def migrate_products(self, db, category_cache: Dict[str, Dict]):
        """Migrate products collection with legacy API structure"""
        products_col = db.products
        # Clear existing products
        await products_col.delete_many({})
        
        products_to_insert = []
        category_counts = {}
        
        for idx, row in self.df.iterrows():
            try:
                # Get product ID - match legacy API format
                product_id = int(row.get('id', idx + 100000))
                
                # Get product name - match legacy API format
                product_name = row.get("name", f"Produto {product_id}")
                
                # Get category info
                category_name = row.get("final_category_name", "Sem Categoria")
                category_info = category_cache.get(category_name, {"id": 0})
                category_id = category_info["id"]
                
                # Count for category stats
                category_counts[category_name] = category_counts.get(category_name, 0) + 1
                
                # Get key features and description - match legacy API format
                key_features = row.get("key_features", f"Produto {product_id}")
                description = row.get("description", key_features)
                
                # Process main specs using legacy API function
                main_specs = process_specs(row)
                
                # Parse dimension specs - match legacy API format
                dimension_specs = {}
                if self.actual_columns.get('dimension_specs'):
                    col_name = self.actual_columns['dimension_specs']
                    if col_name in row and row[col_name]:
                        dimension_specs = parse_specs(row[col_name])
                
                # Get URL - match legacy API format
                url = row.get('Product URL', '')
                
                # Create product document matching legacy API structure
                product_doc = {
                    "id": product_id,
                    "name": product_name,
                    "category": category_name,  # Direct category name like legacy API
                    "final_category_name": category_name,  # Same field as legacy API
                    "description": description,
                    "photo": f"../src/assets/dummyPhoto{(product_id % 6) + 1}.png",  # Same path format as legacy API
                    "status": "Ativo",  # Same status value as legacy API
                    "main_specs": main_specs,
                    "dimension_specs": dimension_specs,
                    "key_features": key_features,
                    "url": url
                }
                
                # Add any additional fields from the CSV that might be needed
                for col in self.df.columns:
                    if col not in product_doc and col not in ['id', 'name', 'category', 'final_category_name', 
                                                              'description', 'photo', 'status', 'main_specs',
                                                              'dimension_specs', 'key_features', 'url']:
                        value = row[col]
                        # Only add non-empty values
                        if pd.notna(value) and value != '' and value != {} and value != []:
                            product_doc[col] = value
                
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
            category_info = category_cache.get(category_name)
            if category_info:
                await categories_col.update_one(
                    {"name": category_name},
                    {"$set": {"product_count": count}}
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
        # Create data directory if it doesn't exist
        os.makedirs(os.path.dirname(csv_path), exist_ok=True)
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