"""
Niutron VRM Avatar Module
"""

from pathlib import Path

# VRM module untuk Niutron
__version__ = "1.0.0"

# Default VRM models path
VRM_MODELS_DIR = Path(__file__).parent.parent.parent / "assets" / "vrm_models"
VRM_ANIMATIONS_DIR = Path(__file__).parent.parent.parent / "assets" / "vrm_animations"

# Create directories if they don't exist
VRM_MODELS_DIR.mkdir(parents=True, exist_ok=True)
VRM_ANIMATIONS_DIR.mkdir(parents=True, exist_ok=True)

# Available expressions
VRM_EXPRESSIONS = [
    "neutral",
    "happy",
    "sad",
    "angry",
    "surprised",
    "relaxed",
    "blink",
    "aa",  # mouth shapes
    "ih",
    "ou",
    "ee",
]

# Available moods
VRM_MOODS = [
    "neutral",
    "happy",
    "sad",
    "angry",
    "surprised",
    "relaxed",
    "excited",
    "thinking",
    "confused",
]
