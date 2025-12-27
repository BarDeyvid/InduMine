# test_pydantic_v2_fixed.py
import sys
import os

# Add the app directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from schemas.user import UserCreate, UserInDB, PyObjectId
from bson import ObjectId
from datetime import datetime
import json

print("=== Testing Pydantic v2 with ObjectId ===\n")

# Test 1: UserCreate validation
print("Test 1: UserCreate validation")
try:
    user = UserCreate(
        email="test@example.com",
        username="testuser123",
        password="Password123"
    )
    print(f"✅ UserCreate valid: {user.email}")
    
    # Test invalid password
    try:
        bad_user = UserCreate(
            email="test2@example.com",
            password="weak"
        )
    except Exception as e:
        print(f"✅ Password validation works")
        
except Exception as e:
    print(f"❌ Error: {e}")

# Test 2: PyObjectId in model
print("\nTest 2: PyObjectId in UserInDB model")
try:
    # Create a UserInDB with ObjectId
    obj_id = ObjectId()
    user_db = UserInDB(
        _id=obj_id,  # Pass ObjectId directly
        email="test@example.com",
        hashed_password="hashed123",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    print(f"✅ Created UserInDB with ObjectId")
    print(f"   ID (as ObjectId): {user_db.id}")
    print(f"   ID type: {type(user_db.id)}")
    
    # Test with string ID
    user_db2 = UserInDB(
        _id=str(obj_id),  # Pass string
        email="test2@example.com",
        hashed_password="hashed456",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    print(f"✅ Created UserInDB with string ID")
    print(f"   ID (converted to ObjectId): {user_db2.id}")
    print(f"   ID type: {type(user_db2.id)}")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()

# Test 3: Serialization to dict and JSON
print("\nTest 3: Serialization")
try:
    user_db = UserInDB(
        _id=ObjectId(),
        email="serialize@example.com",
        hashed_password="hashed789",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    # Convert to dict
    user_dict = user_db.model_dump()
    print(f"✅ Model dump to dict:")
    print(f"   Dict keys: {list(user_dict.keys())}")
    print(f"   ID in dict: {user_dict['id']} (type: {type(user_dict['id'])})")
    
    # Convert to dict with alias
    user_dict_by_alias = user_db.model_dump(by_alias=True)
    print(f"✅ Model dump with alias:")
    print(f"   Dict keys: {list(user_dict_by_alias.keys())}")
    print(f"   _id in dict: {user_dict_by_alias['_id']}")
    
    # Convert to JSON
    user_json = user_db.model_dump_json()
    print(f"✅ Model dump to JSON:")
    print(f"   JSON: {user_json[:100]}...")
    
    # Parse JSON back
    parsed = UserInDB.model_validate_json(user_json)
    print(f"✅ Parsed back from JSON")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()

# Test 4: UserResponse
print("\nTest 4: UserResponse")
try:
    user_response = UserResponse(
        id="507f1f77bcf86cd799439011",
        email="response@example.com",
        username="responseuser",
        is_active=True,
        is_verified=False,
        created_at=datetime.utcnow(),
        roles=["user"]
    )
    print(f"✅ UserResponse created")
    print(f"   Email: {user_response.email}")
    print(f"   ID: {user_response.id}")
    
except Exception as e:
    print(f"❌ Error: {e}")

print("\n=== All tests completed ===")