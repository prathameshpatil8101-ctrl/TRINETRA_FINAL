from pathlib import Path

# backend/
BASE_DIR = Path(__file__).resolve().parent.parent

# backend/models/
MODEL_DIR = BASE_DIR / "models"

# AI model
MODEL_PATH = MODEL_DIR / "best.pt"

# Reference bank
REFERENCE_EMBEDDINGS_PATH = MODEL_DIR / "reference_embeddings.npy"
REFERENCE_METADATA_PATH = MODEL_DIR / "reference_metadata.json"

# Anomaly configuration
CLASS_BASELINES_PATH = MODEL_DIR / "class_similarity_baselines.json"
ANOMALY_CONFIG_PATH = MODEL_DIR / "anomaly_config.json"

# Device
DEVICE = "cpu"

# Supported classes
CLASS_NAMES = {
    0: "submarine_pipeline",
    1: "shipwreck",
    2: "ghost_net",
    3: "mine_cylinder",
}