# database/mongodb.py
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from config import settings
import logging

logger = logging.getLogger(__name__)

class MongoDB:
    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.db: Optional[AsyncIOMotorDatabase] = None

    async def connect(self):
        if self.client is None:
            try:
                self.client = AsyncIOMotorClient(
                    settings.mongodb_url,
                    maxPoolSize=10,
                    minPoolSize=1,
                    serverSelectionTimeoutMS=5000
                )
                # Test connection
                await self.client.admin.command('ping')
                self.db = self.client[settings.mongodb_db_name]
                # Create indexes
                await self._create_indexes()
                print("✅ MongoDB connection verified")
            except Exception as e:
                logger.critical(f"MongoDB connection failed: {str(e)}")
                raise

    async def _create_indexes(self):
        """Create essential database indexes"""
        users = self.db.users
        await users.create_index("email", unique=True)
        await users.create_index("username", unique=True, sparse=True)
        logger.info("✅ Created database indexes")
    
    async def disconnect(self):
        """Disconnect from MongoDB"""
        if self.client:
            self.client.close()
            self.client = None
            self.db = None
            print("❌ Disconnected from MongoDB")
    
    def get_database(self) -> AsyncIOMotorDatabase:
        """Get database instance"""
        if self.db is None:
            raise RuntimeError("Database not initialized. Call connect() first.")
        return self.db
    
    def get_users_collection(self):
        """Get users collection"""
        if self.db is None:
            raise RuntimeError("Database not initialized. Call connect() first.")
        return self.db.users

# Create a global instance
mongodb = MongoDB()

# Helper functions for backward compatibility
async def connect_to_mongo():
    """Connect to MongoDB (for lifespan context manager)"""
    await mongodb.connect()

async def close_mongo_connection():
    """Close MongoDB connection (for lifespan context manager)"""
    await mongodb.disconnect()

def get_database():
    """Get database instance"""
    return mongodb.get_database()

def get_users_collection():
    """Get users collection"""
    return mongodb.get_users_collection()