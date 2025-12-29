# crud/category.py (simplified version)
from typing import Optional, Dict, Any, List
from bson import ObjectId
from datetime import datetime, timezone
import logging
from database.mongodb import mongodb

logger = logging.getLogger(__name__)

class CategoryCRUD:
    def __init__(self):
        self._collection = None
    
    @property
    def collection(self):
        if self._collection is None:
            if mongodb.db is None:
                raise RuntimeError("Database not initialized.")
            self._collection = mongodb.db.categories
        return self._collection
    
    async def get_categories(
        self, 
        page: int = 1, 
        limit: int = 20,
        search: Optional[str] = None,
        user_role: str = "guest"
    ) -> Dict[str, Any]:
        try:
            query = {"status": "active"}
            
            # Add search filter
            if search:
                query["$or"] = [
                    {"name": {"$regex": search, "$options": "i"}},
                    {"description": {"$regex": search, "$options": "i"}}
                ]
            
            total = await self.collection.count_documents(query)
            
            skip = (page - 1) * limit
            cursor = self.collection.find(query).skip(skip).limit(limit)
            
            categories = await cursor.to_list(length=limit)
            
            # Convert ObjectId to string
            for cat in categories:
                cat['id'] = str(cat['_id'])
                del cat['_id']
            
            return {
                "categories": categories,
                "total": total,
                "page": page,
                "limit": limit,
                "total_pages": (total + limit - 1) // limit
            }
            
        except Exception as e:
            logger.error(f"Error getting categories: {e}")
            return {"categories": [], "total": 0, "page": page, "limit": limit, "total_pages": 0}
    
    async def get_popular_categories(self, limit: int = 5, user_role: str = "guest") -> List[Dict[str, Any]]:
        try:
            query = {"status": "active"}
            
            cursor = self.collection.find(query).sort("product_count", -1).limit(limit)
            
            categories = await cursor.to_list(length=limit)
            
            for cat in categories:
                cat['id'] = str(cat['_id'])
                del cat['_id']
            
            return categories
        except Exception as e:
            logger.error(f"Error getting popular categories: {e}")
            return []

# Singleton instance
category_crud = CategoryCRUD()