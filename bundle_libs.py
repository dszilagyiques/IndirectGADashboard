#!/usr/bin/env python3
"""
Indirect G&A Dashboard - JavaScript Library Bundler
Downloads and caches Chart.js and PapaParse for SharePoint compatibility.
"""

import urllib.request
from pathlib import Path

# Library CDN URLs
LIBS = {
    'chart.min.js': 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
    'papaparse.min.js': 'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js',
    'xlsx.full.min.js': 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
}

def download_library(name: str, url: str, lib_dir: Path) -> bool:
    """Download a library from CDN and save to lib folder."""
    output_path = lib_dir / name
    
    print(f"Downloading {name}...")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=30) as response:
            content = response.read()
            output_path.write_bytes(content)
            size_kb = len(content) / 1024
            print(f"  Saved: {output_path} ({size_kb:.1f} KB)")
            return True
    except Exception as e:
        print(f"  ERROR: Failed to download {name}: {e}")
        return False

def main():
    script_dir = Path(__file__).parent
    lib_dir = script_dir / 'lib'
    
    # Ensure lib directory exists
    lib_dir.mkdir(exist_ok=True)
    
    print("=" * 60)
    print("Indirect G&A Dashboard - JavaScript Library Bundler")
    print("=" * 60)
    print()
    
    success_count = 0
    for name, url in LIBS.items():
        if download_library(name, url, lib_dir):
            success_count += 1
    
    print()
    if success_count == len(LIBS):
        print("All libraries downloaded successfully!")
    else:
        print(f"WARNING: {len(LIBS) - success_count} library(ies) failed to download.")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())

