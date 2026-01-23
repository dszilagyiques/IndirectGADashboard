#!/usr/bin/env python3
"""
Indirect G&A Cost Dashboard - Build & Deploy Pipeline

Full automation for building and deploying the dashboard to GitHub Pages.
"""

import argparse
import atexit
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path


# Configuration
OUTPUT_FILE = "outputs/Indirect G&A Dashboard.html"
INDEX_FILE = "index.html"
INPUT_DIR = "input"
LOG_DIR = "logs"

# Logging
_log_file = None


def setup_logging(script_dir: Path):
    """Initialize logging to file."""
    global _log_file
    
    log_dir = script_dir / LOG_DIR
    log_dir.mkdir(exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_path = log_dir / f"deploy_{timestamp}.log"
    
    _log_file = open(log_path, 'w', encoding='utf-8')
    
    header = f"""======================================================================
Indirect G&A Dashboard - Build & Deploy Log
Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
======================================================================

"""
    _log_file.write(header)
    _log_file.flush()
    
    # Register cleanup
    atexit.register(close_log)
    
    return log_path


def close_log():
    """Close log file with footer."""
    global _log_file
    if _log_file:
        footer = f"""
======================================================================
Ended: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
======================================================================
"""
        _log_file.write(footer)
        _log_file.close()
        _log_file = None


def log(message: str):
    """Write to both console and log file."""
    timestamp = datetime.now().strftime("%H:%M:%S")
    log_message = f"[{timestamp}] {message}"
    
    print(message)
    
    if _log_file:
        _log_file.write(log_message + "\n")
        _log_file.flush()


def run_command(cmd: str, cwd: Path = None, capture: bool = False):
    """Run a shell command and log output."""
    log(f"  Running: {cmd}")
    
    result = subprocess.run(
        cmd,
        shell=True,
        cwd=cwd,
        capture_output=True,
        text=True
    )
    
    if result.stdout.strip():
        for line in result.stdout.strip().split('\n'):
            log(f"    {line}")
    
    if result.returncode != 0:
        if result.stderr.strip():
            for line in result.stderr.strip().split('\n'):
                log(f"    ERROR: {line}")
        raise RuntimeError(f"Command failed with exit code {result.returncode}")
    
    return result.stdout.strip() if capture else None


def backup_excel_files(script_dir: Path) -> Path:
    """Backup Excel files before git operations."""
    input_dir = script_dir / INPUT_DIR
    backup_dir = script_dir / ".xlsx_backup_temp"
    
    # Find Excel files
    xlsx_files = list(input_dir.glob("*.xlsx"))
    if not xlsx_files:
        return None
    
    log(f"  Backing up {len(xlsx_files)} Excel file(s)...")
    
    # Create backup directory
    if backup_dir.exists():
        shutil.rmtree(backup_dir)
    backup_dir.mkdir()
    
    # Copy files
    for xlsx_file in xlsx_files:
        shutil.copy2(xlsx_file, backup_dir / xlsx_file.name)
        log(f"    Backed up: {xlsx_file.name}")
    
    return backup_dir


def restore_excel_files(script_dir: Path, backup_dir: Path):
    """Restore Excel files after git operations."""
    if not backup_dir or not backup_dir.exists():
        return
    
    input_dir = script_dir / INPUT_DIR
    input_dir.mkdir(exist_ok=True)
    
    log("  Restoring Excel files...")
    
    for backup_file in backup_dir.glob("*.xlsx"):
        dest_path = input_dir / backup_file.name
        shutil.copy2(backup_file, dest_path)
        log(f"    Restored: {backup_file.name}")
    
    # Clean up backup
    shutil.rmtree(backup_dir)


def sync_with_remote(script_dir: Path):
    """Force sync with remote repository, preserving Excel files."""
    log("\n[1/4] Syncing with remote repository...")
    
    # Backup Excel files
    backup_dir = backup_excel_files(script_dir)
    
    try:
        # Fetch and reset
        run_command("git fetch origin main", cwd=script_dir)
        run_command("git checkout main", cwd=script_dir)
        run_command("git reset --hard origin/main", cwd=script_dir)
        run_command("git clean -fd", cwd=script_dir)
        
        log("  Sync complete!")
    finally:
        # Always restore Excel files
        restore_excel_files(script_dir, backup_dir)


def check_libraries(script_dir: Path):
    """Check if JavaScript libraries exist, download if needed."""
    log("\n[2/4] Checking JavaScript libraries...")
    
    lib_dir = script_dir / "lib"
    required_libs = ["chart.min.js", "papaparse.min.js"]
    
    missing = [lib for lib in required_libs if not (lib_dir / lib).exists()]
    
    if missing:
        log(f"  Missing libraries: {', '.join(missing)}")
        log("  Running bundle_libs.py...")
        run_command(f"{sys.executable} bundle_libs.py", cwd=script_dir)
    else:
        log("  All libraries present!")
        for lib in required_libs:
            size_kb = (lib_dir / lib).stat().st_size / 1024
            log(f"    {lib}: {size_kb:.1f} KB")


def build_dashboard(script_dir: Path):
    """Build the dashboard HTML file."""
    log("\n[3/4] Building dashboard...")

    run_command(f"{sys.executable} build_dashboard.py", cwd=script_dir)
    
    # Copy to index.html
    output_path = script_dir / OUTPUT_FILE
    index_path = script_dir / INDEX_FILE
    
    if output_path.exists():
        shutil.copy2(output_path, index_path)
        log(f"  Copied to {INDEX_FILE}")
        
        size_mb = index_path.stat().st_size / 1024 / 1024
        log(f"  Final size: {size_mb:.2f} MB")
    else:
        raise RuntimeError(f"Build output not found: {output_path}")


def commit_and_push(script_dir: Path, message: str = None):
    """Commit changes and push to GitHub."""
    log("\n[4/4] Committing and pushing to GitHub...")
    
    # Stage files
    run_command("git add index.html", cwd=script_dir)
    run_command(f"git add {INPUT_DIR}/*.xlsx", cwd=script_dir)
    
    # Check if there are changes to commit
    result = subprocess.run(
        "git diff --cached --quiet",
        shell=True,
        cwd=script_dir
    )
    
    if result.returncode == 0:
        log("  No changes to commit!")
        return
    
    # Build commit message
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    if message:
        commit_message = f"{message} ({timestamp})"
    else:
        commit_message = f"Update Indirect G&A Dashboard ({timestamp})"
    
    # Commit
    run_command(f'git commit -m "{commit_message}"', cwd=script_dir)
    
    # Push
    run_command("git push origin main", cwd=script_dir)
    
    log("  Push complete!")


def main():
    parser = argparse.ArgumentParser(
        description="Build and deploy Indirect G&A Cost Dashboard"
    )
    parser.add_argument(
        "--message", "-m",
        help="Custom commit message",
        default=None
    )
    parser.add_argument(
        "--skip-sync",
        action="store_true",
        help="Skip git sync with remote"
    )
    parser.add_argument(
        "--build-only",
        action="store_true",
        help="Only build, don't commit or push"
    )
    
    args = parser.parse_args()
    
    script_dir = Path(__file__).parent.resolve()
    
    print("=" * 60)
    print("  Indirect G&A Dashboard - Build & Deploy Pipeline")
    print("=" * 60)
    
    # Setup logging
    log_path = setup_logging(script_dir)
    log(f"Script directory: {script_dir}")
    log(f"Log file: {log_path}")
    
    try:
        # Step 1: Sync with remote
        if not args.skip_sync and not args.build_only:
            sync_with_remote(script_dir)
        else:
            log("\n[1/4] Skipping remote sync")
        
        # Step 2: Check libraries
        check_libraries(script_dir)
        
        # Step 3: Build dashboard
        build_dashboard(script_dir)
        
        # Step 4: Commit and push
        if not args.build_only:
            commit_and_push(script_dir, args.message)
        else:
            log("\n[4/4] Skipping commit and push (build-only mode)")
        
        print()
        print("=" * 60)
        print("  DEPLOYMENT SUCCESSFUL!")
        print("=" * 60)
        
        return 0
        
    except Exception as e:
        log(f"\nERROR: {e}")
        print()
        print("=" * 60)
        print("  DEPLOYMENT FAILED!")
        print("=" * 60)
        return 1


if __name__ == "__main__":
    sys.exit(main())

