# crud/product.py (simplified version)
from typing import Optional, Dict, Any, List
from bson import ObjectId
from datetime import datetime, timezone
import logging
from database.mongodb import mongodb

logger = logging.getLogger(__name__)

class ProductCRUD:
    def __init__(self):
        self._collection = None
    
    @property
    def collection(self):
        if self._collection is None:
            if mongodb.db is None:
                raise RuntimeError("Database not initialized.")
            self._collection = mongodb.db.products
        return self._collection
    
    async def get_product_by_id(self, product_id: str, user_role: str = "guest") -> Optional[Dict[str, Any]]:
        try:
            product = await self.collection.find_one({
                "_id": ObjectId(product_id)
            })
            
            if product:
                product['id'] = str(product['_id'])
                del product['_id']
            
            return product
        except Exception as e:
            logger.error(f"Error getting product: {e}")
            return None
    
    async def get_products(
        self, 
        page: int = 1, 
        limit: int = 20,
        category: Optional[str] = None,
        search: Optional[str] = None,
        user_role: str = "guest"
    ) -> Dict[str, Any]:
        try:
            query = {"status": "active"}
            
            # Add category filter
            if category:
                query["category_name"] = category
            
            # Add text search
            if search:
                query["$text"] = {"$search": search}
            
            # Get total count
            total = await self.collection.count_documents(query)
            
            # Build projection for slim response
            projection = {
                "id": {"$toString": "$_id"},
                "name": 1,
                "category_name": 1,
                "photo": 1,
                "status": 1,
                "popularity": 1,
                "description": 1
            }
            
            # Execute query with pagination
            cursor = self.collection.find(
                query,
                projection
            ).skip((page - 1) * limit).limit(limit)
            
            # Sort by popularity for better UX
            cursor.sort("popularity", -1)
            
            products = await cursor.to_list(length=limit)
            
            return {
                "products": products,
                "total": total,
                "page": page,
                "limit": limit,
                "total_pages": (total + limit - 1) // limit
            }
            
        except Exception as e:
            logger.error(f"Error getting products: {e}")
            return {"products": [], "total": 0, "page": page, "limit": limit, "total_pages": 0}
    
    async def increment_popularity(self, product_id: str):
        try:
            await self.collection.update_one(
                {"_id": ObjectId(product_id)},
                {"$inc": {"popularity": 1}}
            )
            return True
        except Exception as e:
            logger.error(f"Error incrementing popularity: {e}")
            return False

# Singleton instance
product_crud = ProductCRUD()