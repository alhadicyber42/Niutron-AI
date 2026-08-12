"""
Niutron VRM Avatar UI Integration
Mengintegrasikan VRM avatar ke dalam UI utama Niutron
"""

import json
import shutil
from pathlib import Path
from PyQt6.QtCore import Qt, QTimer, pyqtSignal, QSize
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QPushButton, 
    QLabel, QFrame, QComboBox, QSlider, QFileDialog,
    QListWidget, QListWidgetItem, QMessageBox, QScrollArea
)
from PyQt6.QtGui import QFont, QIcon

try:
    from core.vrm_avatar import VRMAvatar, detect_mood_from_text, WEB_ENGINE_AVAILABLE
    VRM_AVAILABLE = True
except ImportError:
    VRM_AVAILABLE = False
    WEB_ENGINE_AVAILABLE = False
    print("⚠️ VRM Avatar module not available")


# VRM Models directory and config
def _get_base_dir():
    import sys
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    return Path(__file__).resolve().parent.parent

BASE_DIR = _get_base_dir()
VRM_MODELS_DIR = BASE_DIR / "assets" / "vrm_models"
VRM_CONFIG_FILE = BASE_DIR / "config" / "vrm_settings.json"


def load_vrm_config():
    """Load VRM configuration"""
    if VRM_CONFIG_FILE.exists():
        try:
            with open(VRM_CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return {"active_model": None, "last_expression": "neutral"}


def save_vrm_config(config):
    """Save VRM configuration"""
    try:
        VRM_CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(VRM_CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2)
    except Exception as e:
        print(f"⚠️ Failed to save VRM config: {e}")


def get_available_vrm_models():
    """Get list of available VRM models"""
    VRM_MODELS_DIR.mkdir(parents=True, exist_ok=True)
    models = []
    for vrm_file in VRM_MODELS_DIR.glob("*.vrm"):
        models.append({
            "name": vrm_file.stem,
            "path": str(vrm_file),
            "size": vrm_file.stat().st_size
        })
    return sorted(models, key=lambda x: x["name"])


class VRMAvatarPanel(QFrame):
    """Panel kontrol untuk VRM Avatar dengan model selector dan upload"""
    
    expression_changed = pyqtSignal(str, float)
    mood_changed = pyqtSignal(str)
    model_changed = pyqtSignal(str)  # New signal untuk model changes
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.avatar = None
        self.current_config = load_vrm_config()
        self._init_ui()
        
        if VRM_AVAILABLE and WEB_ENGINE_AVAILABLE:
            self.avatar = VRMAvatar(self)
            self.avatar_container.layout().addWidget(self.avatar)
    
    def _init_ui(self):
        """Initialize UI"""
        self.setObjectName("VRMAvatarPanel")
        self.setStyleSheet("""
            QFrame#VRMAvatarPanel {
                background: #07080b;
                border: 1px solid rgba(255, 170, 48, 0.12);
                border-radius: 12px;
            }
            QPushButton {
                background: rgba(255, 170, 48, 0.08);
                color: #f4f6f8;
                border: 1px solid rgba(255, 170, 48, 0.2);
                border-radius: 6px;
                padding: 6px 12px;
                font-size: 11px;
            }
            QPushButton:hover {
                background: rgba(255, 170, 48, 0.15);
                border: 1px solid rgba(255, 170, 48, 0.4);
            }
            QPushButton:pressed {
                background: rgba(255, 170, 48, 0.25);
            }
            QLabel {
                color: #f4f6f8;
            }
            QComboBox {
                background: rgba(255, 255, 255, 0.03);
                color: #f4f6f8;
                border: 1px solid rgba(255, 170, 48, 0.2);
                border-radius: 4px;
                padding: 4px 8px;
            }
            QSlider::groove:horizontal {
                background: rgba(255, 255, 255, 0.1);
                height: 4px;
                border-radius: 2px;
            }
            QSlider::handle:horizontal {
                background: #ffaa30;
                width: 12px;
                height: 12px;
                border-radius: 6px;
                margin: -4px 0;
            }
        """)
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(8, 8, 8, 8)
        layout.setSpacing(8)
        
        # Title
        title = QLabel("🎭 Avatar VRM")
        title.setFont(QFont("Segoe UI", 11, QFont.Weight.Bold))
        title.setStyleSheet("color: #ffaa30; border: none;")
        layout.addWidget(title)
        
        # Avatar container
        self.avatar_container = QFrame()
        self.avatar_container.setMinimumHeight(300)
        self.avatar_container.setStyleSheet("""
            QFrame {
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 170, 48, 0.15);
                border-radius: 8px;
            }
        """)
        avatar_layout = QVBoxLayout(self.avatar_container)
        avatar_layout.setContentsMargins(0, 0, 0, 0)
        
        if not VRM_AVAILABLE or not WEB_ENGINE_AVAILABLE:
            no_vrm_label = QLabel("VRM Avatar tidak tersedia\nInstal QtWebEngine")
            no_vrm_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
            no_vrm_label.setStyleSheet("color: #8e949d; border: none;")
            avatar_layout.addWidget(no_vrm_label)
        
        layout.addWidget(self.avatar_container)
        
        # Model Selector Section
        model_section = QFrame()
        model_section.setStyleSheet("""
            QFrame {
                background: rgba(255, 255, 255, 0.02);
                border: 1px solid rgba(255, 170, 48, 0.1);
                border-radius: 6px;
                padding: 6px;
            }
        """)
        model_layout = QVBoxLayout(model_section)
        model_layout.setSpacing(6)
        model_layout.setContentsMargins(6, 6, 6, 6)
        
        # Model selector label
        model_label = QLabel("📦 Model VRM:")
        model_label.setStyleSheet("border: none; padding: 0; font-weight: bold;")
        model_layout.addWidget(model_label)
        
        # Model dropdown
        self.model_selector = QComboBox()
        self.model_selector.setStyleSheet("""
            QComboBox {
                background: rgba(255, 255, 255, 0.05);
                color: #f4f6f8;
                border: 1px solid rgba(255, 170, 48, 0.3);
                border-radius: 4px;
                padding: 6px 8px;
                font-size: 11px;
            }
            QComboBox::drop-down {
                border: none;
                width: 20px;
            }
            QComboBox::down-arrow {
                image: none;
                border-left: 4px solid transparent;
                border-right: 4px solid transparent;
                border-top: 6px solid #ffaa30;
                margin-right: 6px;
            }
            QComboBox QAbstractItemView {
                background: #0d0f14;
                color: #f4f6f8;
                border: 1px solid rgba(255, 170, 48, 0.3);
                selection-background-color: rgba(255, 170, 48, 0.2);
                padding: 4px;
            }
        """)
        self.model_selector.currentTextChanged.connect(self._on_model_selected)
        model_layout.addWidget(self.model_selector)
        
        # Upload and manage buttons
        model_buttons = QHBoxLayout()
        model_buttons.setSpacing(4)
        
        upload_btn = QPushButton("📤 Upload VRM")
        upload_btn.setToolTip("Upload file VRM baru")
        upload_btn.clicked.connect(self._upload_vrm_file)
        model_buttons.addWidget(upload_btn)
        
        refresh_btn = QPushButton("🔄")
        refresh_btn.setFixedWidth(36)
        refresh_btn.setToolTip("Refresh daftar model")
        refresh_btn.clicked.connect(self._refresh_model_list)
        model_buttons.addWidget(refresh_btn)
        
        delete_btn = QPushButton("🗑️")
        delete_btn.setFixedWidth(36)
        delete_btn.setToolTip("Hapus model yang dipilih")
        delete_btn.clicked.connect(self._delete_current_model)
        model_buttons.addWidget(delete_btn)
        
        model_layout.addLayout(model_buttons)
        
        layout.addWidget(model_section)
        
        # Controls
        controls_frame = QFrame()
        controls_layout = QVBoxLayout(controls_frame)
        controls_layout.setSpacing(6)
        
        # Expression control
        expr_layout = QHBoxLayout()
        expr_label = QLabel("Ekspresi:")
        expr_label.setStyleSheet("border: none;")
        self.expr_combo = QComboBox()
        self.expr_combo.addItems([
            "neutral", "happy", "sad", "angry", 
            "surprised", "relaxed"
        ])
        self.expr_combo.currentTextChanged.connect(self._on_expression_changed)
        expr_layout.addWidget(expr_label)
        expr_layout.addWidget(self.expr_combo, 1)
        controls_layout.addLayout(expr_layout)
        
        # Intensity slider
        intensity_layout = QHBoxLayout()
        intensity_label = QLabel("Intensitas:")
        intensity_label.setStyleSheet("border: none;")
        self.intensity_slider = QSlider(Qt.Orientation.Horizontal)
        self.intensity_slider.setMinimum(0)
        self.intensity_slider.setMaximum(100)
        self.intensity_slider.setValue(100)
        self.intensity_value = QLabel("100%")
        self.intensity_value.setStyleSheet("border: none; min-width: 40px;")
        self.intensity_slider.valueChanged.connect(self._on_intensity_changed)
        intensity_layout.addWidget(intensity_label)
        intensity_layout.addWidget(self.intensity_slider, 1)
        intensity_layout.addWidget(self.intensity_value)
        controls_layout.addLayout(intensity_layout)
        
        # Quick mood buttons
        mood_layout = QHBoxLayout()
        mood_layout.setSpacing(4)
        
        moods = [
            ("😊", "happy"),
            ("😢", "sad"),
            ("😠", "angry"),
            ("😮", "surprised"),
            ("😌", "relaxed"),
        ]
        
        for emoji, mood in moods:
            btn = QPushButton(emoji)
            btn.setFixedSize(36, 36)
            btn.setToolTip(mood.capitalize())
            btn.clicked.connect(lambda checked, m=mood: self._set_mood(m))
            mood_layout.addWidget(btn)
        
        controls_layout.addLayout(mood_layout)
        
        layout.addWidget(controls_frame)
        
        # Initialize model list
        self._refresh_model_list()
    
    def _refresh_model_list(self):
        """Refresh the list of available VRM models"""
        current_selection = self.model_selector.currentText()
        self.model_selector.clear()
        
        models = get_available_vrm_models()
        
        if not models:
            self.model_selector.addItem("(Belum ada model)")
            self.model_selector.setEnabled(False)
            return
        
        self.model_selector.setEnabled(True)
        for model in models:
            size_mb = model["size"] / (1024 * 1024)
            display_text = f"{model['name']} ({size_mb:.1f} MB)"
            self.model_selector.addItem(display_text, model["path"])
        
        # Restore selection or load active model
        active_model = self.current_config.get("active_model")
        if active_model:
            # Find index of active model
            for i in range(self.model_selector.count()):
                model_path = self.model_selector.itemData(i)
                if model_path and Path(model_path).stem == Path(active_model).stem:
                    self.model_selector.setCurrentIndex(i)
                    break
        elif current_selection and current_selection != "(Belum ada model)":
            # Try to restore previous selection
            idx = self.model_selector.findText(current_selection)
            if idx >= 0:
                self.model_selector.setCurrentIndex(idx)
    
    def _on_model_selected(self, model_text):
        """Handle model selection from dropdown"""
        if not self.avatar or model_text == "(Belum ada model)":
            return
        
        idx = self.model_selector.currentIndex()
        model_path = self.model_selector.itemData(idx)
        
        if model_path and Path(model_path).exists():
            print(f"[VRM] Loading model: {model_text}")
            self.avatar.load_vrm(model_path)
            
            # Save active model to config
            self.current_config["active_model"] = model_path
            save_vrm_config(self.current_config)
            
            # Emit signal
            self.model_changed.emit(model_path)
    
    def _upload_vrm_file(self):
        """Upload a new VRM file"""
        file_path, _ = QFileDialog.getOpenFileName(
            self,
            "Upload Model VRM",
            str(Path.home()),
            "VRM Files (*.vrm);;All Files (*.*)"
        )
        
        if not file_path:
            return
        
        source_path = Path(file_path)
        
        # Check if file already exists
        dest_path = VRM_MODELS_DIR / source_path.name
        
        if dest_path.exists():
            reply = QMessageBox.question(
                self,
                "File Sudah Ada",
                f"Model '{source_path.name}' sudah ada. Timpa file lama?",
                QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
                QMessageBox.StandardButton.No
            )
            
            if reply == QMessageBox.StandardButton.No:
                return
        
        try:
            # Copy file to models directory
            VRM_MODELS_DIR.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source_path, dest_path)
            
            print(f"[VRM] Uploaded: {source_path.name}")
            
            # Refresh list and select new model
            self._refresh_model_list()
            
            # Auto-select the newly uploaded model
            for i in range(self.model_selector.count()):
                if source_path.stem in self.model_selector.itemText(i):
                    self.model_selector.setCurrentIndex(i)
                    break
            
            QMessageBox.information(
                self,
                "Upload Berhasil",
                f"Model '{source_path.name}' berhasil diupload dan dimuat!"
            )
            
        except Exception as e:
            QMessageBox.critical(
                self,
                "Upload Gagal",
                f"Gagal mengupload model:\n{str(e)}"
            )
    
    def _delete_current_model(self):
        """Delete the currently selected model"""
        if self.model_selector.currentText() == "(Belum ada model)":
            return
        
        idx = self.model_selector.currentIndex()
        model_path = self.model_selector.itemData(idx)
        
        if not model_path or not Path(model_path).exists():
            QMessageBox.warning(
                self,
                "Model Tidak Ditemukan",
                "Model yang dipilih tidak ditemukan."
            )
            return
        
        model_name = Path(model_path).name
        
        reply = QMessageBox.question(
            self,
            "Hapus Model",
            f"Yakin ingin menghapus model '{model_name}'?\n\nFile akan dihapus permanen.",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No
        )
        
        if reply == QMessageBox.StandardButton.No:
            return
        
        try:
            Path(model_path).unlink()
            print(f"[VRM] Deleted: {model_name}")
            
            # Clear active model if it was deleted
            if self.current_config.get("active_model") == model_path:
                self.current_config["active_model"] = None
                save_vrm_config(self.current_config)
            
            # Refresh list
            self._refresh_model_list()
            
            QMessageBox.information(
                self,
                "Hapus Berhasil",
                f"Model '{model_name}' berhasil dihapus."
            )
            
        except Exception as e:
            QMessageBox.critical(
                self,
                "Hapus Gagal",
                f"Gagal menghapus model:\n{str(e)}"
            )
    
    def _load_vrm_file(self):
        """Legacy method - now redirects to upload"""
        self._upload_vrm_file()
    
    def get_current_model_path(self):
        """Get the path of currently selected model"""
        if self.model_selector.currentText() == "(Belum ada model)":
            return None
        
        idx = self.model_selector.currentIndex()
        return self.model_selector.itemData(idx)
    def _on_expression_changed(self, expression: str):
        """Handle expression combo change"""
        if not self.avatar:
            return
        
        intensity = self.intensity_slider.value() / 100.0
        self.avatar.set_expression(expression, intensity)
        self.expression_changed.emit(expression, intensity)
    
    def _on_intensity_changed(self, value: int):
        """Handle intensity slider change"""
        self.intensity_value.setText(f"{value}%")
        
        if not self.avatar:
            return
        
        expression = self.expr_combo.currentText()
        intensity = value / 100.0
        self.avatar.set_expression(expression, intensity)
    
    def _set_mood(self, mood: str):
        """Set avatar mood"""
        if not self.avatar:
            return
        
        self.avatar.set_mood(mood, 1.0)
        self.mood_changed.emit(mood)
        
        # Update combo to match
        self.expr_combo.setCurrentText(mood)
    
    def set_expression_from_text(self, text: str):
        """Set expression based on text sentiment"""
        if not self.avatar:
            return
        
        mood = detect_mood_from_text(text)
        self._set_mood(mood)
    
    def start_speaking(self):
        """Start speaking animation"""
        if self.avatar:
            self.avatar.animate_speaking(True)
    
    def stop_speaking(self):
        """Stop speaking animation"""
        if self.avatar:
            self.avatar.animate_speaking(False)
    
    def load_default_model(self):
        """Load the last active model or first available model"""
        if not self.avatar:
            return False
        
        # Try to load active model from config
        active_model = self.current_config.get("active_model")
        if active_model and Path(active_model).exists():
            print(f"[VRM] Loading active model: {Path(active_model).name}")
            self.avatar.load_vrm(active_model)
            return True
        
        # Otherwise load first available model
        models = get_available_vrm_models()
        if models:
            first_model = models[0]["path"]
            print(f"[VRM] Loading first available model: {Path(first_model).name}")
            self.avatar.load_vrm(first_model)
            
            # Save as active model
            self.current_config["active_model"] = first_model
            save_vrm_config(self.current_config)
            return True
        
        print("[VRM] No models available to load")
        return False


# Fungsi helper untuk mengintegrasikan VRM ke UI utama
def create_vrm_avatar_dock(parent=None) -> VRMAvatarPanel:
    """
    Create VRM avatar dock widget
    
    Args:
        parent: Parent widget
        
    Returns:
        VRMAvatarPanel instance
    """
    panel = VRMAvatarPanel(parent)
    
    # Try to load default model
    QTimer.singleShot(1000, panel.load_default_model)
    
    return panel


if __name__ == "__main__":
    # Test VRM Panel
    from PyQt6.QtWidgets import QApplication
    import sys
    
    app = QApplication(sys.argv)
    
    panel = VRMAvatarPanel()
    panel.setWindowTitle("Niutron VRM Avatar Panel")
    panel.resize(400, 600)
    panel.show()
    
    sys.exit(app.exec())
