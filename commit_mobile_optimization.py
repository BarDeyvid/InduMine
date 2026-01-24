#!/usr/bin/env python3
"""
Simple script to add and commit mobile optimization changes to git
"""

import subprocess
import os
import sys

def run_command(command, cwd=None):
    """Run a shell command and return success status"""
    try:
        result = subprocess.run(
            command,
            shell=True,
            cwd=cwd,
            capture_output=True,
            text=True
        )
        return result.returncode == 0, result.stdout.strip(), result.stderr.strip()
    except Exception as e:
        return False, "", str(e)

def main():
    # Project root directory
    project_root = os.path.dirname(os.path.abspath(__file__))
    
    print("🚀 Mobile Optimization Git Commit Script")
    print("=" * 50)
    print(f"📁 Working directory: {project_root}")
    print()
    
    # Check if git is available
    success, _, _ = run_command("git --version")
    if not success:
        print("❌ Error: Git is not installed or not available")
        sys.exit(1)
    
    # Check if we're in a git repository
    success, _, _ = run_command("git rev-parse --git-dir", cwd=project_root)
    if not success:
        print("❌ Error: Not in a git repository")
        sys.exit(1)
    
    print("✅ Git repository detected")
    print()
    
    # Show current status
    print("📊 Current git status:")
    print("-" * 50)
    success, stdout, _ = run_command("git status", cwd=project_root)
    if success:
        print(stdout)
    print()
    
    # Add all changes
    print("📝 Staging changes...")
    success, stdout, stderr = run_command("git add .", cwd=project_root)
    if not success:
        print(f"❌ Error staging changes: {stderr}")
        sys.exit(1)
    print("✅ Changes staged")
    print()
    
    # Create commit
    commit_message = """feat: Add mobile optimization and network-aware features

- Implement service worker for intelligent caching (network-first, cache-first, stale-while-revalidate)
- Add code splitting with React.lazy for route-based loading
- Create network detection hook to monitor connection quality
- Implement Network Context for app-wide network status
- Add AdaptiveImage component for lazy loading and fallbacks
- Create NetworkStatusIndicator to show user connection status
- Add mobile utility components (MobileOptimized, MobileOnly, DesktopOnly, ResponsiveGrid)
- Optimize Vite config for better bundling and code splitting
- Enhance HTML with mobile viewport and PWA meta tags
- Create web app manifest for PWA support
- Improve Tailwind CSS with mobile-first responsive design
- Add comprehensive CSS optimizations for mobile rendering
- Implement preload and DNS prefetch for performance
- Add comprehensive mobile optimization documentation"""
    
    print(f"💬 Commit message:")
    print("-" * 50)
    print(commit_message)
    print("-" * 50)
    print()
    
    # Ask for confirmation
    response = input("Proceed with commit? (y/n): ").strip().lower()
    if response != 'y':
        print("❌ Commit cancelled")
        sys.exit(0)
    
    # Perform commit
    success, stdout, stderr = run_command(
        f'git commit -m "{commit_message}"',
        cwd=project_root
    )
    
    if not success:
        if "nothing to commit" in stderr.lower() or "nothing to commit" in stdout.lower():
            print("ℹ️  No changes to commit (working tree clean)")
        else:
            print(f"❌ Error creating commit: {stderr}")
            sys.exit(1)
    else:
        print("✅ Commit created successfully!")
        print()
        print(stdout)
    
    print()
    print("=" * 50)
    print("✨ Done! Mobile optimization changes committed to git")
    print()
    
    # Show recent commit
    print("📜 Recent commits:")
    print("-" * 50)
    success, stdout, _ = run_command("git log --oneline -5", cwd=project_root)
    if success:
        print(stdout)

if __name__ == "__main__":
    main()
