#!/usr/bin/env python3
"""
Script to commit the Admin Panel implementation
"""
import subprocess
import sys

def run_command(cmd, description=""):
    """Run a shell command and handle errors"""
    print(f"\n{'='*60}")
    if description:
        print(f"📝 {description}")
    print(f"🔄 Running: {cmd}")
    print('='*60)
    
    result = subprocess.run(cmd, shell=True)
    return result.returncode == 0

def main():
    # Change to repo directory
    import os
    os.chdir(r"C:\Users\Deyvi\Documents\InduMine")
    
    # Show current status
    print("\n📊 Current Git Status:")
    run_command("git status", "Checking current status")
    
    # Stage all changes
    if not run_command("git add .", "Staging all changes"):
        print("\n❌ Failed to stage changes")
        sys.exit(1)
    
    # Show what will be committed
    print("\n📋 Files to be committed:")
    run_command("git diff --cached --name-only", "Listing staged files")
    
    # Ask for confirmation
    confirmation = input("\n✅ Do you want to continue with the commit? (y/n): ").strip().lower()
    if confirmation != 'y':
        print("\n❌ Commit cancelled")
        sys.exit(0)
    
    # Create commit
    commit_message = """feat: Add comprehensive Admin Panel for user management

- Admin-only route with role-based access control (AdminRoute)
- User management page with:
  * User list with search and filtering by role
  * Admin stats dashboard (total users, active users, admins, inactive)
  * Edit user dialog to manage:
    - User role (user/admin/moderator)
    - Account status (active/inactive)
    - Allowed categories
  * Delete user functionality with confirmation
  * Real-time data updates
  
- Backend admin endpoints:
  * GET /users - List all users with filtering
  * GET /users/{id} - Get user details
  * PATCH /users/{id}/role - Update user role
  * PATCH /users/{id}/categories - Update allowed categories
  * PATCH /users/{id}/status - Toggle user status
  * DELETE /users/{id} - Delete user
  * GET /users/counts/stats - Get user statistics
  
- Frontend features:
  * Admin link in header navigation (Shield icon)
  * Admin page with responsive table and stats cards
  * Edit user modal with category selection
  * Delete confirmation dialog
  * Admin-only route protection
  * Proper error handling and loading states
  
- API helper functions for all admin operations"""
    
    if not run_command(f'git commit -m "{commit_message}"', "Creating commit"):
        print("\n❌ Failed to create commit")
        sys.exit(1)
    
    # Show recent commits
    print("\n📜 Recent Commits:")
    run_command("git log --oneline -5", "Showing last 5 commits")
    
    print("\n" + "="*60)
    print("✨ Successfully committed Admin Panel implementation!")
    print("="*60)

if __name__ == "__main__":
    main()
