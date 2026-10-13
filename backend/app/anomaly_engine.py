import json
import numpy as np

from .config import (
    REFERENCE_EMBEDDINGS_PATH,
    REFERENCE_METADATA_PATH,
    CLASS_BASELINES_PATH,
    ANOMALY_CONFIG_PATH,
)


class TrinetraAnomalyEngine:
    def __init__(self):
        print("Loading TRINETRA anomaly engine...")

        # Reference embeddings: shape (400, 256)
        self.reference_embeddings = np.load(
            REFERENCE_EMBEDDINGS_PATH
        )

        # Reference metadata
        with open(REFERENCE_METADATA_PATH, "r", encoding="utf-8") as f:
            self.reference_metadata = json.load(f)

        # Class-specific similarity baselines
        with open(CLASS_BASELINES_PATH, "r", encoding="utf-8") as f:
            self.class_baselines = json.load(f)

        # Global anomaly configuration
        with open(ANOMALY_CONFIG_PATH, "r", encoding="utf-8") as f:
            self.anomaly_config = json.load(f)

        print(
            f"Reference bank loaded: "
            f"{self.reference_embeddings.shape}"
        )

        print("Anomaly engine ready.")

    def find_nearest_reference(self, embedding):
        """
        Compare an object embedding against the reference bank
        using cosine similarity.
        """

        embedding = np.asarray(embedding, dtype=np.float32)

        # Normalize query embedding
        norm = np.linalg.norm(embedding)

        if norm > 0:
            embedding = embedding / norm

        # Reference embeddings are already normalized.
        similarities = self.reference_embeddings @ embedding

        best_index = int(np.argmax(similarities))
        best_similarity = float(similarities[best_index])

        metadata = self.reference_metadata[best_index]

        # Support different possible metadata field names
        reference_class = (
            metadata.get("class_name")
            or metadata.get("class")
            or metadata.get("label")
        )

        return {
            "class_name": reference_class,
            "similarity": best_similarity,
            "reference_index": best_index,
        }

    def get_class_baseline(self, class_name):
        """
        Get P05 and P10 similarity thresholds for a class.
        """

        baseline = self.class_baselines.get(class_name, {})

        p05 = float(baseline.get("p05", 0.0))
        p10 = float(baseline.get("p10", 0.0))

        return p05, p10

    def classify_similarity(self, similarity, p05, p10):
        """
        Convert similarity into a transparent evidence level.
        """

        if similarity >= p10:
            return "STRONG_KNOWN_LIKE"

        if similarity >= p05:
            return "KNOWN_LIKE_LOW_CONFIDENCE"

        return "LOW_SIMILARITY"

    def analyze_detection(
        self,
        yolo_class,
        yolo_confidence,
        embedding,
    ):
        """
        Analyze one YOLO detection using the reference bank.
        """

        nearest = self.find_nearest_reference(embedding)

        feature_class = nearest["class_name"]
        similarity = nearest["similarity"]

        p05, p10 = self.get_class_baseline(feature_class)

        similarity_status = self.classify_similarity(
            similarity,
            p05,
            p10
        )

        models_agree = yolo_class == feature_class

        # Final TRINETRA decision
        if similarity_status == "LOW_SIMILARITY":
            status = "ANOMALY_CANDIDATE"

        elif not models_agree:
            status = "REVIEW_REQUIRED"

        elif similarity_status == "KNOWN_LIKE_LOW_CONFIDENCE":
            status = "REVIEW_REQUIRED"

        else:
            status = "KNOWN_LIKE"

        human_verification_required = (
            status in [
                "REVIEW_REQUIRED",
                "ANOMALY_CANDIDATE"
            ]
        )

        return {
            "yolo_class": yolo_class,
            "yolo_confidence": round(yolo_confidence, 4),

            "feature_nearest_class": feature_class,
            "feature_similarity": round(similarity, 4),

            "class_baseline_p05": round(p05, 4),
            "class_baseline_p10": round(p10, 4),

            "models_agree": models_agree,

            "similarity_status": similarity_status,

            "status": status,

            "human_verification_required":
                human_verification_required,
        }