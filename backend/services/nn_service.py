# services/nn_service.py
"""
Service to run Neural Network predictions and update MongoDB with recommendations.
"""
import asyncio
import joblib
import pandas as pd
from typing import List, Dict, Any
import logging
from database.mongodb import mongodb
from crud.product import product_crud

logger = logging.getLogger(__name__)

class NNService:
    def __init__(self, model_path: str = "predict/weg_categoria_predictor_v1.pkl"):
        self.model = None
        self.features = None
        self.load_model(model_path)
    
    def load_model(self, model_path: str):
        """Load pre-trained NN model"""
        try:
            self.model = joblib.load(model_path)
            self.features = joblib.load('predict/weg_features_list.pkl')
            logger.info(f"✅ Loaded NN model from {model_path}")
        except Exception as e:
            logger.error(f"❌ Failed to load NN model: {e}")
    
    async def update_all_similarities(self):
        """Update similar products for all products"""
        if not self.model:
            logger.error("NN model not loaded")
            return
        
        db = mongodb.db
        products_col = db.products
        
        # Get all products
        cursor = products_col.find({}, {"_id": 1, "name": 1, "category_name": 1})
        products = await cursor.to_list(length=None)
        
        for product in products:
            try:
                # Get similar products based on NN
                similar_ids = await self.find_similar_products(
                    product_id=str(product["_id"]),
                    product_data=product
                )
                
                # Update in database
                await product_crud.update_similar_products(
                    product_id=str(product["_id"]),
                    similar_ids=similar_ids
                )
                
                logger.debug(f"Updated similarities for product {product['_id']}")
                
            except Exception as e:
                logger.error(f"Error updating similarities for {product['_id']}: {e}")
    
    async def find_similar_products(self, product_id: str, product_data: Dict) -> List[str]:
        """Find similar products using NN"""
        # This is a placeholder - implement your actual NN logic here
        # For now, return products from same category
        
        db = mongodb.db
        products_col = db.products
        
        # Find 5 most popular products from same category
        similar = await products_col.find({
            "category_name": product_data.get("category_name"),
            "_id": {"$ne": product_data["_id"]}
        }, {
            "_id": 1
        }).sort("popularity", -1).limit(5).to_list(length=5)
        
        return [str(item["_id"]) for item in similar]
    
    async def predict_category(self, product_data: Dict) -> str:
        """Predict category for new product"""
        if not self.model:
            return "Unknown"
        
        # Prepare features for prediction
        features_dict = {}
        for feature in self.features:
            features_dict[feature] = product_data.get(feature, 'missing')
        
        # Make prediction
        prediction = self.model.predict([features_dict])[0]
        
        return prediction

async def run_nn_updates():
    """Run NN updates periodically"""
    service = NNService()
    
    while True:
        try:
            logger.info("🔄 Running NN similarity updates...")
            await service.update_all_similarities()
            logger.info("✅ NN updates completed")
            
            # Run every 24 hours
            await asyncio.sleep(24 * 60 * 60)
            
        except Exception as e:
            logger.error(f"❌ NN update failed: {e}")
            await asyncio.sleep(60 * 60)  # Retry in 1 hour

if __name__ == "__main__":
    # Run NN service
    asyncio.run(run_nn_updates())