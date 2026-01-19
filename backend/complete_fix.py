#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text

# Database connection
DB_USER = "root"
DB_PASSWORD = "Mv1208811#"
DB_HOST = "localhost"
DB_NAME = "indumine_db"
DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}?charset=utf8mb4"

engine = create_engine(DATABASE_URL)

def fix_database():
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            print("Checking 'users' table structure...")
            
            # Check current columns
            result = conn.execute(text("SHOW COLUMNS FROM users"))
            current_columns = [row[0] for row in result.fetchall()]
            print(f"Current columns: {current_columns}")
            
            # Define expected columns based on your models
            expected_columns = [
                'id', 'email', 'username', 'hashed_password', 'full_name',
                'role', 'is_active', 'allowed_categories', 'created_at'
            ]
            
            print(f"\nExpected columns: {expected_columns}")
            
            # Add missing columns
            for column in expected_columns:
                if column not in current_columns:
                    print(f"\nAdding missing column: {column}")
                    
                    if column == 'id':
                        # This should be auto-increment primary key
                        pass
                    elif column == 'email':
                        conn.execute(text(f"ALTER TABLE users ADD COLUMN {column} VARCHAR(255)"))
                        conn.execute(text(f"ALTER TABLE users ADD UNIQUE INDEX email_unique ({column})"))
                    elif column == 'username':
                        conn.execute(text(f"ALTER TABLE users ADD COLUMN {column} VARCHAR(100)"))
                        conn.execute(text(f"ALTER TABLE users ADD UNIQUE INDEX username_unique ({column})"))
                    elif column == 'hashed_password':
                        conn.execute(text(f"ALTER TABLE users ADD COLUMN {column} VARCHAR(255) NOT NULL"))
                    elif column == 'full_name':
                        conn.execute(text(f"ALTER TABLE users ADD COLUMN {column} VARCHAR(200)"))
                    elif column == 'role':
                        conn.execute(text(f"ALTER TABLE users ADD COLUMN {column} VARCHAR(50) DEFAULT 'user'"))
                    elif column == 'is_active':
                        conn.execute(text(f"ALTER TABLE users ADD COLUMN {column} BOOLEAN DEFAULT TRUE"))
                    elif column == 'allowed_categories':
                        conn.execute(text(f"ALTER TABLE users ADD COLUMN {column} JSON"))
                    elif column == 'created_at':
                        conn.execute(text(f"ALTER TABLE users ADD COLUMN {column} TEXT"))
                    
                    print(f"✓ Added {column}")
            
            # Remove unexpected columns (like 'profile', 'roles', etc.)
            unexpected_columns = ['profile', 'roles', 'is_verified', 'updated_at']
            for column in unexpected_columns:
                if column in current_columns:
                    print(f"\nRemoving unexpected column: {column}")
                    conn.execute(text(f"ALTER TABLE users DROP COLUMN {column}"))
                    print(f"✓ Removed {column}")
            
            # Final structure
            result = conn.execute(text("SHOW COLUMNS FROM users"))
            print("\nFinal 'users' table structure:")
            for row in result:
                print(f"  {row[0]} ({row[1]})")
            
            trans.commit()
            print("\n✓ Database fixed successfully!")
            
        except Exception as e:
            trans.rollback()
            print(f"\n✗ Error: {e}")
            print("Transaction rolled back.")

if __name__ == "__main__":
    print("This script will fix your 'users' table structure.")
    confirm = input("Continue? (yes/no): ").strip().lower()
    if confirm == 'yes':
        fix_database()
    else:
        print("Cancelled.")
