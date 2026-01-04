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
        mongodb_db_name = "indumine_db"
    
    settings = Settings()

logger = logging.getLogger(__name__)

class DataMigrator:
    def __init__(self, csv_path: str):
        self.csv_path = csv_path
        self.df = None
        self.category_cache = {}  # name -> ObjectId
    
    def extract_product_name_from_url(self, url: str) -> str:
        """Extract product name from URL - smarter version"""
        if not isinstance(url, str) or pd.isna(url):
            return "Produto Sem Nome"
        
        try:
            # Split by '/p/' to get the product ID part
            parts = url.split('/p/')
            if len(parts) > 1:
                # The part before '/p/' contains the path
                path_part = parts[0]
                
                # Get all path segments
                segments = [unquote(s) for s in path_part.split('/') if s]
                
                # Look for the last segment that looks like a product name
                # Skip generic segments like 'en', 'br', 'catalog', 'weg'
                skip_words = {'en', 'br', 'catalog', 'weg', 'product', 'products'}
                
                for i in range(len(segments) - 1, -1, -1):
                    segment = segments[i]
                    segment_lower = segment.lower()
                    
                    # Skip if it's a generic word or looks like a category/family
                    if (segment_lower in skip_words or 
                        any(word in segment_lower for word in ['family', 'category', 'line', 'group', 'type'])):
                        continue
                    
                    # This looks like a product name
                    clean_name = segment.replace('-', ' ').strip()
                    if clean_name:
                        # Title case if it's all caps or mixed
                        if segment.isupper() or ('-' in segment and any(c.isupper() for c in segment)):
                            return clean_name.title()
                        return clean_name
                
                # If no good segment found, use the last non-skip segment
                for segment in reversed(segments):
                    if segment.lower() not in skip_words:
                        return segment.replace('-', ' ').strip().title()
            
            return "Produto Sem Nome"
        except Exception as e:
            logger.debug(f"Error extracting name from URL {url}: {e}")
            return "Produto Sem Nome"
    
    def get_robust_category(self, row):
        """
        Extracts a clean category name using a fallback hierarchy.
        SIMPLIFIED VERSION - focuses on what actually works.
        """
        # 1. Check for explicit category columns
        category_cols = ['Product group', 'Product family', 'Type', 'Application', 
                        'PAINT PRODUCTS LINE', 'Family', 'Product type']
        
        for col in category_cols:
            val = row.get(col)
            if pd.notnull(val) and str(val).strip() not in ['', 'Not applicable', 'nan', 'None', 'NAO RELEVANTE']:
                category = str(val).strip().title()
                category = category.replace('_', ' ').replace('-', ' ')
                category = ' '.join(category.split())  # Remove extra spaces
                if category:
                    return category
        
        # 2. Extract from URL (simpler version)
        url = row.get('Product URL')
        if pd.notnull(url) and isinstance(url, str):
            try:
                if '/en/' in url:
                    # Get the path between '/en/' and '/p/'
                    path_content = url.split("/en/")[1].split("/p/")[0]
                    segments = [unquote(s) for s in path_content.split('/') if s]
                    
                    if segments:
                        # Use the first segment as category
                        category = segments[0].replace('-', ' ').title()
                        if category and category.lower() not in ['product', 'products']:
                            return category
            except:
                pass
        
        # 3. Default category
        return "Industrial Products"
    
    def extract_all_technical_specs(self, row: pd.Series) -> List[Dict[str, Any]]:
        """
        Extract ALL columns as technical specs and return as an array of objects.
        Each object has 'name' and 'value' fields.
        """
        specs_list = []
        
        # Skip these columns (we already store them separately)
        skip_columns = {
            'Product URL', 'product_id', 'category_name',
            'Description', 'description', 'DESCRICAO TINTA'  # Description is stored separately
        }
        
        for col_name, value in row.items():
            # Skip if in skip list
            if col_name in skip_columns:
                continue
                
            # Check if value is valid
            if pd.notnull(value) and str(value).strip() not in ['', 'Not applicable', 'nan', 'None', 'NAO RELEVANTE']:
                value_str = str(value).strip()
                
                # Skip very long values that might be errors
                if len(value_str) <= 200:
                    # Clean column name
                    clean_name = col_name.strip()
                    
                    specs_list.append({
                        "name": clean_name,
                        "value": value_str
                    })
        
        return specs_list

    def extract_important_tech_specs(self, technical_specs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Extract the most important technical specs for quick access.
        Returns a dictionary with important specs.
        """
        important_specs = {}
        
        # Define important spec names (case-insensitive)
        important_spec_names = {
            'frame', 'model', 'reference', 'power', 'voltage', 'current',
            'type', 'product type', 'product family', 'family', 'application',
            'color', 'material', 'frequency', 'rated current', 'rated power'
        }
        
        for spec in technical_specs:
            spec_name_lower = spec['name'].lower()
            
            # Check if this is an important spec
            if spec_name_lower in important_spec_names:
                important_specs[spec['name']] = spec['value']
            # Also check for partial matches
            elif any(keyword in spec_name_lower for keyword in ['frame', 'model', 'ref', 'power', 'volt', 'current', 'type']):
                important_specs[spec['name']] = spec['value']
        
        return important_specs

    def build_key_features(self, row: pd.Series, technical_specs: List[Dict[str, Any]], important_specs: Dict[str, Any]) -> str:
        """
        Build key features from the most important technical specs.
        """
        features = []
        
        # Priority 1: Product description if available
        desc_cols = ['Description', 'description', 'DESCRICAO TINTA']
        for col in desc_cols:
            if col in row and pd.notnull(row[col]):
                desc = str(row[col]).strip()
                if desc and desc.lower() not in ['nan', 'none']:
                    features.append(desc)
                    break
        
        # Priority 2: Important specs that define the product
        important_specs_order = [
            'Product type', 'Type', 'Product family', 'Family',
            'Application', 'Power', 'Voltage', 'Current', 'Frequency',
            'Color', 'Material', 'Finish', 'Size', 'Model', 'Reference',
            'Frame', 'Rated Power', 'Rated current'
        ]
        
        for spec_name in important_specs_order:
            if spec_name in important_specs:
                features.append(f"{spec_name}: {important_specs[spec_name]}")
        
        # Priority 3: If we have very few features, add some more from all technical specs
        if len(features) < 3 and technical_specs:
            # Add up to 5 more specs (but not too obscure ones)
            added = 0
            for spec in technical_specs:
                spec_name = spec['name']
                if spec_name not in important_specs and added < 5:
                    # Skip very long or obscure column names
                    if len(spec_name) < 50 and len(spec['value']) < 50:
                        features.append(f"{spec_name}: {spec['value']}")
                        added += 1
        
        # Priority 4: If still empty, use product name
        if not features:
            product_name = self.extract_product_name_from_url(row.get('Product URL', ''))
            if product_name != "Produto Sem Nome":
                features.append(product_name)
        
        # Join all features
        if features:
            return " • ".join(features[:10])  # Limit to 10 features max
        
        return "Produto Industrial"
    
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
        await products.create_index([("specs_count", 1)])
        
        # Create text index for search - including technical_specs values
        await products.create_index([
            ("name", "text"),
            ("description", "text"),
            ("key_features", "text"),
            ("technical_specs.value", "text")
        ])
        
        # Category indexes
        await categories.create_index("name", unique=True)
        await categories.create_index([("allowed_roles", 1)])
        await categories.create_index([("product_count", -1)])
        
        logger.info("✅ Created optimized indexes")
    
    def load_and_preprocess_csv(self):
        """Load CSV with pre-cleaning - better handling of sparse data"""
        logger.info(f"📥 Loading CSV from {self.csv_path}")
        
        try:
            if not os.path.exists(self.csv_path):
                logger.error(f"❌ CSV file not found: {self.csv_path}")
                return self.create_dummy_data()
            
            # Read CSV with better handling of sparse columns
            df = pd.read_csv(
                self.csv_path, 
                on_bad_lines='skip', 
                low_memory=False, 
                encoding='utf-8',
                dtype=str  # Read all as strings to preserve data
            )
            
            logger.info(f"✅ Loaded {len(df)} rows, {len(df.columns)} columns")
            
            # Log column information
            non_empty_cols = []
            for col in df.columns:
                non_null_count = df[col].notna().sum()
                if non_null_count > 0:
                    non_empty_cols.append((col, non_null_count))
            
            logger.info(f"📊 Non-empty columns (out of {len(df.columns)} total):")
            for col, count in sorted(non_empty_cols, key=lambda x: x[1], reverse=True)[:20]:
                logger.info(f"  {col}: {count} non-empty values")
            
            if len(non_empty_cols) > 20:
                logger.info(f"  ... and {len(non_empty_cols) - 20} more columns")
            
            # Pre-cleaning: Replace NaN with None for MongoDB sparse storage
            df = df.replace({np.nan: None})
            df = df.replace({pd.NA: None})
            
            # Clean column names - remove extra whitespace
            df.columns = [str(col).strip() for col in df.columns]
            
            # Apply robust category extraction
            logger.info("🏷️ Extracting categories...")
            df["category_name"] = df.apply(self.get_robust_category, axis=1)
            
            # Generate product ID
            df["product_id"] = (df.index + 1).astype("Int64")
            
            # Log category distribution
            category_counts = df["category_name"].value_counts()
            logger.info("📊 Category distribution:")
            for category, count in category_counts.head(15).items():
                logger.info(f"  {category}: {count} products")
            
            if len(category_counts) > 15:
                logger.info(f"  ... and {len(category_counts) - 15} more categories")
            
            self.df = df
            logger.info(f"✅ Preprocessing complete. {len(df)} rows ready for migration")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to load CSV: {e}")
            import traceback
            traceback.print_exc()
            return self.create_dummy_data()
    
    def create_dummy_data(self):
        """Create dummy data for testing"""
        logger.info("📝 Creating dummy data for testing...")
        
        data = {
            'Product URL': [
                'https://www.weg.net/en/motors/product1',
                'https://www.weg.net/en/Coatings-and-Varnishes/Automotive-Refinishing/VINYLIC-BLACK-MATTE/p/12260702'
            ],
            'Description': ['High efficiency motor', 'Vinylic black matte finish'],
            'Power': ['10kW', None],
            'Voltage': ['220V', None],
            'Color': [None, 'Black'],
            'PAINT FINISH': [None, 'Matte'],
            'Product type': ['Motor', 'Coating']
        }
        
        df = pd.DataFrame(data)
        df["product_id"] = (df.index + 1).astype("Int64")
        df["category_name"] = df.apply(self.get_robust_category, axis=1)
        
        self.df = df
        logger.info("✅ Created dummy data")
        return True
    
    def get_product_name(self, row: pd.Series) -> str:
        """Get product name with fallbacks"""
        # 1. Extract from URL (most reliable for unique product codes)
        url = row.get('Product URL')
        if pd.notnull(url):
            name_from_url = self.extract_product_name_from_url(url)
            if name_from_url != "Produto Sem Nome":
                return name_from_url
        
        # 2. Try description
        if 'Description' in row and pd.notnull(row['Description']):
            desc = str(row['Description']).strip()
            if desc and len(desc) < 100:  # Reasonable length for a name
                return desc
        
        # 3. Try model or reference
        for col in ['Model', 'Reference', 'Product reference']:
            if col in row and pd.notnull(row[col]):
                model = str(row[col]).strip()
                if model:
                    return model
        
        # 4. Fallback
        return f"Product {row.get('product_id', '')}"
    
    def get_category_allowed_roles(self, category_name: str) -> List[str]:
        """Determine which roles can access this category"""
        # Define role-based access
        ROLE_CATEGORIES = {
            "admin": ["ALL"],
            "analise_de_dados": ["ALL"],
            "tintas_e_vernizes": ["Coatings", "Varnishes", "Paint", "Coating", "Varnish"],
            "mecanica": ["Motors", "Drives", "Mechanical", "Tools", "Equipment"],
            "eletrotecnica": ["Motors", "Drives", "Inverters", "Electrical", "Power", "Voltage", "Current"],
            "manutencao_eletroeletronica": ["Motors", "Drives", "Sensors", "Relays", "Controllers", "Automation"],
            "desenvolvimento_de_sistemas": ["Digital", "Software", "Controllers", "Gateways"],
            "automacao_e_conectividade": ["Automation", "Controllers", "Sensors", "Gateways", "Digital"],
            "eletromecanica": ["Motors", "Drives", "Controllers", "Automation", "Mechanical", "Electrical"]
        }
        
        category_lower = category_name.lower()
        
        allowed_roles = ["guest"]  # Everyone gets guest access
        
        for role, keywords in ROLE_CATEGORIES.items():
            if keywords == ["ALL"]:
                allowed_roles.append(role)
            else:
                for keyword in keywords:
                    if keyword.lower() in category_lower:
                        allowed_roles.append(role)
                        break
        
        # Remove duplicates while preserving order
        seen = set()
        unique_roles = []
        for role in allowed_roles:
            if role not in seen:
                seen.add(role)
                unique_roles.append(role)
        
        return unique_roles
    
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
                "description": f"Products in category: {category_name}",
                "photo": f"/assets/categories/cat{(i % 6) + 1}.jpg",
                "product_count": 0,
                "status": "active",
                "allowed_roles": allowed_roles,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            
            result = await categories_col.insert_one(category_doc)
            category_cache[category_name] = result.inserted_id
            
            logger.info(f"✅ Created category: {category_name} (Roles: {len(allowed_roles)})")
        
        self.category_cache = category_cache
        return category_cache
    
    async def migrate_products(self, db, category_cache: Dict[str, ObjectId]):
        """Migrate products collection with array-based technical specs"""
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
                category_name = row.get("category_name", "Industrial Products")
                
                # Get category reference
                category_id = category_cache.get(category_name)
                if not category_id:
                    logger.warning(f"Category '{category_name}' not found for product {product_name}")
                    continue
                
                # Count for category stats
                category_counts[category_name] = category_counts.get(category_name, 0) + 1
                
                # Extract ALL technical specs as an array
                technical_specs_array = self.extract_all_technical_specs(row)
                
                # Extract important specs for quick access
                important_specs = self.extract_important_tech_specs(technical_specs_array)
                
                # Build key features from important specs
                key_features = self.build_key_features(row, technical_specs_array, important_specs)
                
                # Create description (truncated key features)
                description = key_features[:200] + "..." if len(key_features) > 200 else key_features
                
                # Determine allowed roles based on category
                allowed_roles = self.get_category_allowed_roles(category_name)
                
                # Create product document with array-based technical specs
                product_doc = {
                    "original_id": product_id,
                    "name": product_name,
                    "category_id": category_id,
                    "category_name": category_name,
                    "description": description,
                    "photo": f"/assets/products/prod{(product_id % 6) + 1}.jpg",
                    "status": "active",
                    "key_features": key_features,
                    "url": row.get('Product URL'),
                    "allowed_roles": allowed_roles,
                    "popularity": 0,
                    "technical_specs": technical_specs_array if technical_specs_array else [],
                    "important_specs": important_specs if important_specs else {},
                    "specs_count": len(technical_specs_array),
                    "created_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc)
                }
                
                # Remove None values for sparse storage
                product_doc = {k: v for k, v in product_doc.items() if v is not None}
                
                products_to_insert.append(product_doc)
                
                # Log progress
                if len(products_to_insert) % 100 == 0:
                    logger.info(f"📦 Processed {len(products_to_insert)} products")
                    # Log a sample
                    if len(products_to_insert) == 100:
                        logger.info(f"📝 Sample specs array: {technical_specs_array[:3]}")
                
            except Exception as e:
                logger.error(f"❌ Error processing row {idx}: {e}")
                import traceback
                traceback.print_exc()
                continue
        
        # Insert all products at once
        if products_to_insert:
            await products_col.insert_many(products_to_insert)
            logger.info(f"📦 Inserted {len(products_to_insert)} products")
            
            # Log sample of what was stored
            sample_idx = min(5, len(products_to_insert) - 1)
            sample = products_to_insert[sample_idx]
            logger.info(f"📝 Sample product stored:")
            logger.info(f"   Name: {sample.get('name')}")
            logger.info(f"   Category: {sample.get('category_name')}")
            logger.info(f"   Total specs: {sample.get('specs_count', 0)}")
            logger.info(f"   Important specs: {list(sample.get('important_specs', {}).keys())}")
            
            if sample.get('technical_specs'):
                logger.info(f"   First 3 technical specs:")
                for i, spec in enumerate(sample['technical_specs'][:3]):
                    logger.info(f"      {spec['name']}: {spec['value']}")
        
        # Update category counts
        categories_col = db.categories
        for category_name, count in category_counts.items():
            category_id = category_cache.get(category_name)
            if category_id:
                await categories_col.update_one(
                    {"_id": category_id},
                    {"$set": {"product_count": count, "updated_at": datetime.now(timezone.utc)}}
                )
        
        # Log final category distribution
        logger.info("📊 Final category product counts:")
        for category_name, count in sorted(category_counts.items(), key=lambda x: x[1], reverse=True):
            logger.info(f"  {category_name}: {count} products")
        
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
            
            # Verify some data was stored correctly
            sample_products = await db.products.find({}, {
                "name": 1, 
                "category_name": 1, 
                "key_features": 1,
                "technical_specs": 1
            }).limit(3).to_list(length=3)
            
            for i, product in enumerate(sample_products):
                logger.info(f"📋 Sample {i+1}: {product.get('name')}")
                logger.info(f"   Category: {product.get('category_name')}")
                if product.get('technical_specs'):
                    spec_count = len(product['technical_specs'])
                    logger.info(f"   Technical specs stored: {spec_count}")
            
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
            logging.StreamHandler(sys.stdout), 
            logging.FileHandler('migration.log', encoding='utf-8')
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