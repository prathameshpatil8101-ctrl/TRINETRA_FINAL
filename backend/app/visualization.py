import cv2
import numpy as np


def draw_detections(image, detections):
    """
    Draw TRINETRA detection results on an image.

    Args:
        image: OpenCV BGR image
        detections: List of detection dictionaries

    Returns:
        Annotated OpenCV BGR image
    """

    annotated = image.copy()

    for detection in detections:

        x1, y1, x2, y2 = detection["bbox"]

        x1 = int(x1)
        y1 = int(y1)
        x2 = int(x2)
        y2 = int(y2)

        status = detection["status"]

        class_name = detection["yolo_class"]
        confidence = detection["yolo_confidence"]

        similarity = detection["feature_similarity"]

        # --------------------------------------------------
        # Status-based display label
        # --------------------------------------------------

        if status == "ANOMALY_CANDIDATE":
            label = "ANOMALY CANDIDATE"

        elif status == "REVIEW_REQUIRED":
            label = "REVIEW REQUIRED"

        else:
            label = "KNOWN LIKE"

        # --------------------------------------------------
        # Bounding box
        # --------------------------------------------------

        cv2.rectangle(
            annotated,
            (x1, y1),
            (x2, y2),
            (255, 255, 255),
            2,
        )

        # --------------------------------------------------
        # Label
        # --------------------------------------------------

        text = (
            f"{class_name} | "
            f"YOLO {confidence:.2f} | "
            f"SIM {similarity:.2f}"
        )

        status_text = label

        # Background for text
        (text_width, text_height), _ = cv2.getTextSize(
            text,
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            1,
        )

        cv2.rectangle(
            annotated,
            (x1, max(0, y1 - 50)),
            (x1 + text_width + 10, y1),
            (0, 0, 0),
            -1,
        )

        cv2.putText(
            annotated,
            text,
            (x1 + 5, max(15, y1 - 28)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            (255, 255, 255),
            1,
            cv2.LINE_AA,
        )

        cv2.putText(
            annotated,
            status_text,
            (x1 + 5, max(32, y1 - 8)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (255, 255, 255),
            1,
            cv2.LINE_AA,
        )

    return annotated