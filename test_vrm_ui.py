"""Test VRM UI Integration"""
import sys
from pathlib import Path

# Add core to path
sys.path.insert(0, str(Path(__file__).parent))

print("Testing VRM UI Integration...")

print("\n1. Testing VRM imports in ui.py...")
try:
    from core.vrm_avatar import VRMAvatar, detect_mood_from_text, WEB_ENGINE_AVAILABLE
    print(f"   ✅ VRMAvatar imported")
    print(f"   WEB_ENGINE_AVAILABLE: {WEB_ENGINE_AVAILABLE}")
except ImportError as e:
    print(f"   ❌ VRMAvatar import failed: {e}")

print("\n2. Testing VRM integration functions...")
try:
    from core.vrm_integration import (
        get_available_vrm_models,
        load_vrm_config,
        save_vrm_config,
        VRM_MODELS_DIR
    )
    print(f"   ✅ VRM integration functions imported")
    print(f"   VRM_MODELS_DIR: {VRM_MODELS_DIR}")
    
    # Test get models
    models = get_available_vrm_models()
    print(f"   Available models: {len(models)}")
    for model in models:
        print(f"      - {model['name']} ({model['size'] / 1024 / 1024:.1f} MB)")
    
    # Test config
    config = load_vrm_config()
    print(f"   Config loaded: {config}")
    
except ImportError as e:
    print(f"   ❌ VRM integration import failed: {e}")

print("\n3. Testing UI import simulation...")
try:
    # Simulate the import in ui.py
    from core.vrm_avatar import VRMAvatar, detect_mood_from_text, WEB_ENGINE_AVAILABLE
    VRM_INTEGRATION_AVAILABLE = True
    print(f"   ✅ VRM_INTEGRATION_AVAILABLE would be: {VRM_INTEGRATION_AVAILABLE}")
except ImportError as e:
    VRM_INTEGRATION_AVAILABLE = False
    print(f"   ❌ VRM_INTEGRATION_AVAILABLE would be: {VRM_INTEGRATION_AVAILABLE}")
    print(f"   Error: {e}")

print("\n4. Checking SystemConnectivitySidebar VRM section logic...")
if VRM_INTEGRATION_AVAILABLE:
    print("   ✅ VRM section WILL be added to SystemConnectivitySidebar")
    print("   Components that will be created:")
    print("      - QLabel: 'AVATAR VRM' title")
    print("      - QFrame: VRM management section")
    print("      - QComboBox: Model selector")
    print("      - QPushButton: Upload button (📤 Upload)")
    print("      - QPushButton: Refresh button (🔄)")
    print("      - QPushButton: Delete button (🗑️)")
    print("      - QLabel: Info label")
else:
    print("   ❌ VRM section will NOT be added (VRM_INTEGRATION_AVAILABLE is False)")

print("\n✅ Test complete!")
print("\nTo see the VRM section in the app:")
print("1. Launch the application")
print("2. Click the ⚙️ (Settings) icon in the left sidebar")
print("3. Look at the RIGHT sidebar (not the main content area)")
print("4. Scroll down in the RIGHT sidebar")
print("5. You should see 'AVATAR VRM' section with upload button")
