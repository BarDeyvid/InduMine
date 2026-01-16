# ==================== MIGRATION.PY ====================
import asyncio
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Any, Optional
import logging
import os
import sys
import json
from urllib.parse import unquote
import re

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.database import engine, AsyncSessionLocal, Category, Product, ProductSpec, create_tables
from backend.backend.config import settings

logger = logging.getLogger(__name__)

class DataMigrator:
    def __init__(self, csv_path: str):
        self.csv_path = csv_path
        self.df = None
        self.category_cache = {}  # name -> Category object
    
    def extract_product_name_from_url(self, url: str) -> str:
        """Extract product name from URL"""
        if not isinstance(url, str) or pd.isna(url):
            return "Produto Sem Nome"
        
        try:
            parts = url.split('/p/')
            if len(parts) > 1:
                prod_id = int(parts[1].split('/')[0])
                name_part = parts[0].split('/')[-2] or parts[0].split('/')[-1]
                clean_name = unquote(name_part).replace('-', ' ').strip()
                return clean_name.title()
            return "Produto Sem Nome"
        except:
            return "Produto Sem Nome"
    
    def get_robust_category(self, row):
        """Extract category from row"""
        category_cols = ['Product group', 'Product family', 'Type', 'Application', 
                        'PAINT PRODUCTS LINE', 'Family', 'Product type']
        
        for col in category_cols:
            val = row.get(col)
            if pd.notnull(val) and str(val).strip() not in ['', 'Not applicable', 'nan', 'None', 'NAO RELEVANTE']:
                category = str(val).strip().title()
                category = category.replace('_', ' ').replace('-', ' ')
                category = ' '.join(category.split())
                if category:
                    return category
        
        # Extract from URL
        url = row.get('Product URL')
        if pd.notnull(url) and isinstance(url, str):
            try:
                if '/en/' in url:
                    path_content = url.split("/en/")[1].split("/p/")[0]
                    segments = [unquote(s) for s in path_content.split('/') if s]
                    if segments:
                        category = segments[0].replace('-', ' ').title()
                        if category and category.lower() not in ['product', 'products']:
                            return category
            except:
                pass
        
        return "Industrial Products"
    
    def extract_all_technical_specs(self, row: pd.Series) -> List[Dict[str, Any]]:
        """Extract all columns as technical specs"""
        specs_list = []
        
        skip_columns = {
            'Product URL', 'product_id', 'category_name',
            'Description', 'description', 'DESCRICAO TINTA'
        }
        
        for col_name, value in row.items():
            if col_name in skip_columns:
                continue
                
            if pd.notnull(value) and str(value).strip() not in ['', 'Not applicable', 'nan', 'None', 'NAO RELEVANTE']:
                value_str = str(value).strip()
                if len(value_str) <= 200:
                    clean_name = col_name.strip()
                    specs_list.append({
                        "name": clean_name,
                        "value": value_str
                    })
        
        return specs_list
    
    def extract_important_tech_specs(self, technical_specs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Extract important technical specs"""
        important_specs = {}
        important_spec_names = {
            'frame', 'model', 'reference', 'power', 'voltage', 'current',
            'type', 'product type', 'product family', 'family', 'application',
            'color', 'material', 'frequency', 'rated current', 'rated power'
        }
        
        for spec in technical_specs:
            spec_name_lower = spec['name'].lower()
            if spec_name_lower in important_spec_names:
                important_specs[spec['name']] = spec['value']
            elif any(keyword in spec_name_lower for keyword in ['frame', 'model', 'ref', 'power', 'volt', 'current', 'type']):
                important_specs[spec['name']] = spec['value']
        
        return important_specs
    
    def build_key_features(self, row: pd.Series, technical_specs: List[Dict[str, Any]], important_specs: Dict[str, Any]) -> str:
        """Build key features"""
        features = []
        
        desc_cols = ['Description', 'description', 'DESCRICAO TINTA']
        for col in desc_cols:
            if col in row and pd.notnull(row[col]):
                desc = str(row[col]).strip()
                if desc and desc.lower() not in ['nan', 'none']:
                    features.append(desc)
                    break
        
        important_specs_order = [
            'Product type', 'Type', 'Product family', 'Family',
            'Application', 'Power', 'Voltage', 'Current', 'Frequency',
            'Color', 'Material', 'Finish', 'Size', 'Model', 'Reference',
            'Frame', 'Rated Power', 'Rated current'
        ]
        
        for spec_name in important_specs_order:
            if spec_name in important_specs:
                features.append(f"{spec_name}: {important_specs[spec_name]}")
        
        if len(features) < 3 and technical_specs:
            added = 0
            for spec in technical_specs:
                spec_name = spec['name']
                if spec_name not in important_specs and added < 5:
                    if len(spec_name) < 50 and len(spec['value']) < 50:
                        features.append(f"{spec_name}: {spec['value']}")
                        added += 1
        
        if not features:
            product_name = self.extract_product_name_from_url(row.get('Product URL', ''))
            if product_name != "Produto Sem Nome":
                features.append(product_name)
        
        if features:
            return " • ".join(features[:10])
        
        return "Produto Industrial"
    
    def get_category_allowed_roles(self, category_name: str) -> List[str]:
        """Determine which roles can access this category"""
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
        allowed_roles = ["guest"]
        
        for role, keywords in ROLE_CATEGORIES.items():
            if keywords == ["ALL"]:
                allowed_roles.append(role)
            else:
                for keyword in keywords:
                    if keyword.lower() in category_lower:
                        allowed_roles.append(role)
                        break
        
        seen = set()
        unique_roles = []
        for role in allowed_roles:
            if role not in seen:
                seen.add(role)
                unique_roles.append(role)
        
        return unique_roles
    
    async def migrate_categories(self, session):
        """Migrate categories to MySQL"""
        logger.info("📁 Migrating categories...")
        
        unique_categories = self.df["category_name"].dropna().unique()
        logger.info(f"📊 Found {len(unique_categories)} unique categories")
        
        for i, category_name in enumerate(unique_categories):
            allowed_roles = self.get_category_allowed_roles(category_name)
            
            category = Category(
                name=category_name,
                description=f"Products in category: {category_name}",
                photo=f"/assets/categories/cat{(i % 6) + 1}.jpg",
                product_count=0,
                status="active",
                allowed_roles=allowed_roles
            )
            
            session.add(category)
            await session.flush()  # Get the ID
            self.category_cache[category_name] = category
            
            if i % 10 == 0:
                logger.info(f"✅ Processed {i+1} categories")
        
        await session.commit()
        logger.info(f"✅ Created {len(self.category_cache)} categories")
        return self.category_cache
    
    async def migrate_products(self, session, category_cache: Dict[str, Category]):
        """Migrate products to MySQL"""
        logger.info("📦 Migrating products...")
        
        category_counts = {}
        batch_size = 100
        products_processed = 0
        
        for idx, row in self.df.iterrows():
            try:
                product_id = int(row.get('product_id', idx + 100000))
                product_name = self.extract_product_name_from_url(row.get('Product URL', ''))
                category_name = row.get("category_name", "Industrial Products")
                
                category = category_cache.get(category_name)
                if not category:
                    logger.warning(f"Category '{category_name}' not found for product {product_name}")
                    continue
                
                # Count for stats
                category_counts[category_name] = category_counts.get(category_name, 0) + 1
                
                # Extract specs
                technical_specs_array = self.extract_all_technical_specs(row)
                important_specs = self.extract_important_tech_specs(technical_specs_array)
                key_features = self.build_key_features(row, technical_specs_array, important_specs)
                
                description = key_features[:200] + "..." if len(key_features) > 200 else key_features
                allowed_roles = self.get_category_allowed_roles(category_name)
                
                # Create product
                product = Product(
                    original_id=product_id,
                    name=product_name,
                    category_id=category.id,
                    category_name=category_name,
                    description=description,
                    photo=f"/assets/products/prod{(product_id % 6) + 1}.jpg",
                    status="active",
                    key_features=key_features,
                    url=row.get('Product URL'),
                    allowed_roles=allowed_roles,
                    popularity=0,
                    technical_specs=technical_specs_array,
                    important_specs=important_specs,
                    specs_count=len(technical_specs_array)
                )
                
                session.add(product)
                products_processed += 1
                
                # Batch commit
                if products_processed % batch_size == 0:
                    await session.commit()
                    logger.info(f"📦 Processed {products_processed} products")
                    
            except Exception as e:
                logger.error(f"❌ Error processing row {idx}: {e}")
                continue
        
        # Final commit
        await session.commit()
        
        # Update category counts
        for category_name, count in category_counts.items():
            category = category_cache.get(category_name)
            if category:
                category.product_count = count
        
        await session.commit()
        
        logger.info(f"📦 Inserted {products_processed} products")
        
        # Log category distribution
        logger.info("📊 Final category product counts:")
        for category_name, count in sorted(category_counts.items(), key=lambda x: x[1], reverse=True):
            logger.info(f"  {category_name}: {count} products")
        
        return products_processed
    
    async def run_migration(self):
        """Main migration function"""
        logger.info("🚀 Starting MySQL data migration...")
        
        try:
            # Create tables
            await create_tables()
            
            # Load CSV
            if not os.path.exists(self.csv_path):
                logger.error(f"❌ CSV file not found: {self.csv_path}")
                return False
            
            logger.info(f"📥 Loading CSV from {self.csv_path}")
            self.df = pd.read_csv(self.csv_path, on_bad_lines='skip', low_memory=False, encoding='utf-8', dtype=str)
            logger.info(f"✅ Loaded {len(self.df)} rows, {len(self.df.columns)} columns")
            
            # Preprocess
            self.df = self.df.replace({np.nan: None})
            self.df.columns = [str(col).strip() for col in self.df.columns]
            
            logger.info("🏷️ Extracting categories...")
            self.df["category_name"] = self.df.apply(self.get_robust_category, axis=1)
            self.df["product_id"] = (self.df.index + 1).astype("Int64")
            
            async with AsyncSessionLocal() as session:
                # Migrate categories
                category_cache = await self.migrate_categories(session)
                
                # Migrate products
                product_count = await self.migrate_products(session, category_cache)
                
                # Final stats
                from sqlalchemy import select, func
                
                total_products = await session.execute(select(func.count()).select_from(Product))
                total_categories = await session.execute(select(func.count()).select_from(Category))
                
                logger.info(f"✅ Migration completed successfully!")
                logger.info(f"📊 Statistics:")
                logger.info(f"  - Products: {total_products.scalar()}")
                logger.info(f"  - Categories: {total_categories.scalar()}")
                
                return True
                
        except Exception as e:
            logger.error(f"❌ Migration failed: {e}")
            import traceback
            traceback.print_exc()
            return False

def find_csv_file():
    """Find CSV file"""
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

async def main():
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler('migration.log', encoding='utf-8')
        ]
    )
    
    # Get CSV path
    import sys
    if len(sys.argv) > 1:
        csv_path = sys.argv[1]
    else:
        csv_path = find_csv_file()
    
    if not csv_path:
        logger.warning("❌ CSV file not found. Please provide path as argument.")
        return
    
    logger.info(f"📄 Using CSV file: {csv_path}")
    
    # Run migration
    migrator = DataMigrator(csv_path)
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

if __name__ == "__main__":
    asyncio.run(main())