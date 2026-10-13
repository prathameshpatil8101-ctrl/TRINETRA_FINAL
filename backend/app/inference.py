import numpy as np
from ultralytics import YOLO

from .config import MODEL_PATH, DEVICE


class TrinetraInference:
    def __init__(self):
        print("Loading TRINETRA model...")

        self.model = YOLO(str(MODEL_PATH))

        print("Model loaded successfully.")
        print(f"Device: {DEVICE}")
        print(f"Classes: {self.model.names}")

    def detect(self, image):
        """
        Run YOLO object detection on an image.

        Returns:
            list of detections
        """

        results = self.model.predict(
            source=image,
            imgsz=640,
            device=DEVICE,
            verbose=False
        )

        result = results[0]

        detections = []

        if result.boxes is None:
            return detections

        for i, box in enumerate(result.boxes):

            class_id = int(box.cls[0].item())
            confidence = float(box.conf[0].item())

            x1, y1, x2, y2 = box.xyxy[0].tolist()

            detections.append({
                "detection_id": i + 1,
                "class_id": class_id,
                "class_name": self.model.names[class_id],
                "confidence": confidence,
                "bbox": [
                    round(x1, 2),
                    round(y1, 2),
                    round(x2, 2),
                    round(y2, 2)
                ]
            })

        return detections

    def get_embedding(self, crop):
        """
        Extract the 256-dimensional embedding used
        by the TRINETRA anomaly engine.
        """

        results = self.model.predict(
            source=crop,
            imgsz=640,
            embed=[9],
            device=DEVICE,
            verbose=False
        )

        embedding = results[0]

        # Convert Torch tensor → NumPy
        embedding = embedding.detach().cpu().numpy()

        # Normalize embedding
        norm = np.linalg.norm(embedding)

        if norm > 0:
            embedding = embedding / norm

        return embedding