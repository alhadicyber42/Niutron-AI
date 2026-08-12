"""
Niutron VRM Avatar Integration
Mengelola avatar VRM 3D untuk antarmuka Niutron
"""

import json
import os
from pathlib import Path
from typing import Optional, Callable
from PyQt6.QtCore import QUrl, QTimer, pyqtSignal, QObject
from PyQt6.QtWidgets import QWidget, QVBoxLayout

try:
    from PyQt6.QtWebEngineWidgets import QWebEngineView
    from PyQt6.QtWebChannel import QWebChannel
    WEB_ENGINE_AVAILABLE = True
except ImportError:
    WEB_ENGINE_AVAILABLE = False
    print("⚠️ QtWebEngine not available - VRM Avatar disabled")


class VRMAvatarBridge(QObject):
    """Bridge untuk komunikasi antara Python dan JavaScript VRM viewer"""
    
    expression_changed = pyqtSignal(str, float)
    animation_finished = pyqtSignal(str)
    
    def __init__(self):
        super().__init__()
        self._current_expression = "neutral"
        self._current_mood = "neutral"
    
    def on_expression_changed(self, expression: str, value: float):
        """Callback ketika ekspresi berubah"""
        self._current_expression = expression
        self.expression_changed.emit(expression, value)
    
    def on_animation_finished(self, animation_name: str):
        """Callback ketika animasi selesai"""
        self.animation_finished.emit(animation_name)


class VRMAvatar(QWidget):
    """Widget VRM Avatar untuk Niutron"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.vrm_loaded = False
        self.bridge = VRMAvatarBridge()
        self._web_view = None
        self._channel = None
        self._init_ui()
    
    def _init_ui(self):
        """Initialize UI"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        
        if not WEB_ENGINE_AVAILABLE:
            from PyQt6.QtWidgets import QLabel
            label = QLabel("VRM Avatar memerlukan QtWebEngine")
            label.setStyleSheet("color: #ffaa30; padding: 20px;")
            layout.addWidget(label)
            return
        
        # Create web view
        from PyQt6.QtWebEngineCore import QWebEngineSettings
        self._web_view = QWebEngineView(self)
        
        # Enable developer console and debugging
        settings = self._web_view.settings()
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalContentCanAccessRemoteUrls, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.ErrorPageEnabled, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.PluginsEnabled, True)
        
        layout.addWidget(self._web_view)
        
        # Setup web channel for Python-JS communication
        self._channel = QWebChannel()
        self._channel.registerObject('bridge', self.bridge)
        self._web_view.page().setWebChannel(self._channel)
        
        # Connect console messages from JavaScript
        self._web_view.page().javaScriptConsoleMessage = self._on_js_console_message
        
        # Connect signals for debugging
        self._web_view.loadFinished.connect(self._on_load_finished)
        self._web_view.loadStarted.connect(lambda: print("[VRM] Page load started"))
        
        # Load VRM viewer HTML
        html_path = self._get_html_path()
        if html_path.exists():
            print(f"[VRM] Loading HTML from: {html_path.name}")
            self._web_view.setUrl(QUrl.fromLocalFile(str(html_path)))
        else:
            print(f"⚠️ VRM viewer HTML not found: {html_path}")
    
    def _on_js_console_message(self, level, message, lineNumber, sourceID):
        """Forward JavaScript console messages to Python"""
        print(f"[VRM-JS] {message}")
    
    def _on_load_finished(self, ok):
        """Callback when page load finishes"""
        if ok:
            print("[VRM] HTML page loaded successfully")
        else:
            print("[VRM] HTML page failed to load")
    
    def _get_html_path(self) -> Path:
        """Get path to VRM viewer HTML"""
        if hasattr(os.sys, 'frozen'):
            base_dir = Path(os.sys.executable).parent
        else:
            base_dir = Path(__file__).resolve().parent.parent
        
        # Try working version first (ES modules with import maps)
        working_path = base_dir / "assets" / "vrm_viewer" / "index_working.html"
        if working_path.exists():
            print(f"[VRM] Using ES module version (index_working.html)")
            return working_path
        
        # Try simple version (non-module)
        simple_path = base_dir / "assets" / "vrm_viewer" / "index_simple.html"
        if simple_path.exists():
            print(f"[VRM] Using non-module version (index_simple.html)")
            return simple_path
        
        # Fallback to regular version
        print(f"[VRM] Using default version (index.html)")
        return base_dir / "assets" / "vrm_viewer" / "index.html"
    
    def load_vrm(self, vrm_path: str, max_retries: int = 50) -> bool:
        """
        Load VRM model
        
        Args:
            vrm_path: Path to VRM file or URL
            max_retries: Maximum number of retries to wait for vrmAPI
            
        Returns:
            True if loading initiated successfully
        """
        if not self._web_view:
            print("⚠️ Web view not available")
            return False
        
        retry_count = [0]  # Use list to make it mutable in nested function
        
        # Check if page is loaded
        def check_and_load():
            # Convert to absolute path if local file
            path = vrm_path
            if not path.startswith('http'):
                path = Path(path).resolve().as_uri()
            
            # Check if vrmAPI is available
            check_code = "typeof window.vrmAPI !== 'undefined' && typeof window.vrmAPI.loadVRM === 'function'"
            
            def on_check_result(is_ready):
                if is_ready:
                    print(f"[VRM] vrmAPI ready, loading model: {Path(vrm_path).name}")
                    js_code = f"window.vrmAPI.loadVRM('{path}');"
                    self._web_view.page().runJavaScript(js_code, self._on_vrm_loaded)
                else:
                    retry_count[0] += 1
                    if retry_count[0] < max_retries:
                        if retry_count[0] % 10 == 0:
                            print(f"[VRM] Waiting for vrmAPI... ({retry_count[0]}/{max_retries})")
                        QTimer.singleShot(200, check_and_load)
                    else:
                        print(f"[VRM] ❌ vrmAPI not ready after {max_retries} attempts")
                        print(f"[VRM] Check browser console in assets/vrm_viewer/index.html for errors")
            
            self._web_view.page().runJavaScript(check_code, on_check_result)
        
        # Start checking after a short delay to let page initialize
        QTimer.singleShot(1000, check_and_load)
        return True
    
    def _on_vrm_loaded(self, result):
        """Callback when VRM is loaded"""
        self.vrm_loaded = bool(result)
        if self.vrm_loaded:
            print("✅ VRM Avatar loaded successfully")
        else:
            print("❌ Failed to load VRM Avatar")
    
    def set_expression(self, expression: str, value: float = 1.0):
        """
        Set facial expression
        
        Args:
            expression: Expression name (happy, sad, angry, surprised, neutral, etc.)
            value: Intensity (0.0 to 1.0)
        """
        if not self._web_view:
            return
        
        js_code = f"window.vrmAPI.setExpression('{expression}', {value});"
        self._web_view.page().runJavaScript(js_code)
    
    def set_mood(self, mood: str, intensity: float = 1.0):
        """
        Set overall mood
        
        Args:
            mood: Mood name (happy, sad, angry, surprised, neutral, relaxed)
            intensity: Intensity (0.0 to 1.0)
        """
        if not self._web_view:
            return
        
        js_code = f"window.vrmAPI.setMood('{mood}', {intensity});"
        self._web_view.page().runJavaScript(js_code)
    
    def update_lip_sync(self, level: float):
        """
        Update lip sync for speaking
        
        Args:
            level: Speech level (0.0 to 1.0)
        """
        if not self._web_view:
            return
        
        js_code = f"window.vrmAPI.updateLipSync({level});"
        self._web_view.page().runJavaScript(js_code)
    
    def look_at(self, x: float, y: float, z: float):
        """
        Make avatar look at a position
        
        Args:
            x, y, z: 3D coordinates to look at
        """
        if not self._web_view:
            return
        
        js_code = f"window.vrmAPI.lookAt({x}, {y}, {z});"
        self._web_view.page().runJavaScript(js_code)
    
    def play_animation(self, animation_name: str):
        """
        Play VRMA animation
        
        Args:
            animation_name: Name of animation to play
        """
        if not self._web_view:
            return
        
        js_code = f"window.vrmAPI.playAnimation('{animation_name}');"
        self._web_view.page().runJavaScript(js_code)
    
    def get_status(self, callback: Callable[[str], None]):
        """
        Get current status
        
        Args:
            callback: Function to call with status string
        """
        if not self._web_view:
            callback("unavailable")
            return
        
        js_code = "window.vrmAPI.getStatus();"
        self._web_view.page().runJavaScript(js_code, callback)
    
    def animate_speaking(self, is_speaking: bool):
        """
        Animate avatar when speaking
        
        Args:
            is_speaking: True if currently speaking
        """
        if is_speaking:
            # Start lip sync animation
            self._start_lip_sync()
        else:
            # Stop lip sync
            self._stop_lip_sync()
    
    def _start_lip_sync(self):
        """Start lip sync animation"""
        if not hasattr(self, '_lip_sync_timer'):
            self._lip_sync_timer = QTimer(self)
            self._lip_sync_timer.timeout.connect(self._update_lip_sync_frame)
        
        if not self._lip_sync_timer.isActive():
            self._lip_sync_timer.start(50)  # Update every 50ms
    
    def _stop_lip_sync(self):
        """Stop lip sync animation"""
        if hasattr(self, '_lip_sync_timer') and self._lip_sync_timer.isActive():
            self._lip_sync_timer.stop()
            self.update_lip_sync(0.0)  # Reset mouth
    
    def _update_lip_sync_frame(self):
        """Update lip sync animation frame"""
        import random
        # Generate random lip sync level (simulated)
        level = random.uniform(0.3, 0.8)
        self.update_lip_sync(level)


# Mood detection based on text sentiment
def detect_mood_from_text(text: str) -> str:
    """
    Simple mood detection from text
    
    Args:
        text: Input text
        
    Returns:
        Mood name (happy, sad, angry, surprised, neutral)
    """
    text_lower = text.lower()
    
    # Positive emotions
    if any(word in text_lower for word in ['haha', 'senang', 'bahagia', 'hebat', 'keren', 'wow', 'mantap']):
        return 'happy'
    
    # Sad emotions
    if any(word in text_lower for word in ['sedih', 'kecewa', 'duka', 'susah']):
        return 'sad'
    
    # Angry emotions
    if any(word in text_lower for word in ['marah', 'kesal', 'benci', 'jengkel']):
        return 'angry'
    
    # Surprised emotions
    if any(word in text_lower for word in ['kaget', 'surprise', 'terkejut', 'wah', 'wow']):
        return 'surprised'
    
    # Relaxed/calm
    if any(word in text_lower for word in ['tenang', 'santai', 'rileks', 'damai']):
        return 'relaxed'
    
    return 'neutral'


if __name__ == "__main__":
    # Test VRM Avatar
    from PyQt6.QtWidgets import QApplication
    import sys
    
    app = QApplication(sys.argv)
    
    avatar = VRMAvatar()
    avatar.setWindowTitle("Niutron VRM Avatar Test")
    avatar.resize(800, 600)
    avatar.show()
    
    # Load a VRM model after a delay
    QTimer.singleShot(2000, lambda: avatar.load_vrm("path/to/your/model.vrm"))
    
    sys.exit(app.exec())
