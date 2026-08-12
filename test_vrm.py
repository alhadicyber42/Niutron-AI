"""Test VRM integration"""

print("Testing VRM integration...")

print("\n1. Testing PyQt6 imports...")
try:
    from PyQt6.QtCore import Qt
    print("   ✅ PyQt6.QtCore")
except ImportError as e:
    print(f"   ❌ PyQt6.QtCore: {e}")

try:
    from PyQt6.QtWidgets import QApplication, QWidget
    print("   ✅ PyQt6.QtWidgets")
except ImportError as e:
    print(f"   ❌ PyQt6.QtWidgets: {e}")

print("\n2. Testing QtWebEngine...")
try:
    from PyQt6.QtWebEngineWidgets import QWebEngineView
    print("   ✅ PyQt6.QtWebEngineWidgets.QWebEngineView")
    WEB_ENGINE_AVAILABLE = True
except ImportError as e:
    print(f"   ❌ PyQt6.QtWebEngineWidgets: {e}")
    WEB_ENGINE_AVAILABLE = False

try:
    from PyQt6.QtWebChannel import QWebChannel
    print("   ✅ PyQt6.QtWebChannel")
except ImportError as e:
    print(f"   ❌ PyQt6.QtWebChannel: {e}")

print(f"\n3. WEB_ENGINE_AVAILABLE: {WEB_ENGINE_AVAILABLE}")

print("\n4. Testing core.vrm_avatar import...")
try:
    from core.vrm_avatar import VRMAvatar, WEB_ENGINE_AVAILABLE as CORE_WEB_ENGINE
    print(f"   ✅ core.vrm_avatar imported")
    print(f"   CORE_WEB_ENGINE_AVAILABLE: {CORE_WEB_ENGINE}")
except ImportError as e:
    print(f"   ❌ core.vrm_avatar: {e}")

print("\n5. Testing core.vrm_integration import...")
try:
    from core.vrm_integration import VRMAvatarPanel, create_vrm_avatar_dock, VRM_AVAILABLE
    print(f"   ✅ core.vrm_integration imported")
    print(f"   VRM_AVAILABLE: {VRM_AVAILABLE}")
except ImportError as e:
    print(f"   ❌ core.vrm_integration: {e}")

print("\n✅ Test complete!")
