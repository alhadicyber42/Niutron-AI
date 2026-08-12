"""
Download Three.js and VRM libraries locally
This fixes the CDN loading issue in QWebEngineView
"""

import requests
from pathlib import Path

# Base directory for libraries
BASE_DIR = Path("assets/vrm_viewer/lib")
BASE_DIR.mkdir(parents=True, exist_ok=True)

# Files to download
files = {
    "three.module.js": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
    "addons/GLTFLoader.js": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js",
    "addons/OrbitControls.js": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js",
    "three-vrm.module.js": "https://cdn.jsdelivr.net/npm/@pixiv/three-vrm@2.0.7/lib/three-vrm.module.js",
}

print("=" * 60)
print("  Downloading VRM Libraries")
print("=" * 60)
print()

total = len(files)
success = 0

for filename, url in files.items():
    filepath = BASE_DIR / filename
    filepath.parent.mkdir(parents=True, exist_ok=True)
    
    try:
        print(f"📥 Downloading {filename}...")
        print(f"   URL: {url}")
        
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        with open(filepath, 'wb') as f:
            f.write(response.content)
        
        size_kb = len(response.content) / 1024
        print(f"   ✅ Saved {filename} ({size_kb:.1f} KB)")
        success += 1
        
    except Exception as e:
        print(f"   ❌ Failed: {e}")
    
    print()

print("=" * 60)
print(f"  Download Complete: {success}/{total} files")
print("=" * 60)

if success == total:
    print("\n✅ All libraries downloaded successfully!")
    print("\nNext steps:")
    print("1. Update assets/vrm_viewer/index.html to use local paths")
    print("2. Restart Niutron application")
    print("3. Upload VRM model in Settings")
else:
    print(f"\n⚠️ Some downloads failed ({total - success} errors)")
    print("\nTroubleshooting:")
    print("- Check internet connection")
    print("- Try running script again")
    print("- Check if URLs are accessible in browser")
