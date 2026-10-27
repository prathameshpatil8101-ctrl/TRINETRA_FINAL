import base64
import os

import cv2
import numpy as np

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .inference import TrinetraInference
from .anomaly_engine import TrinetraAnomalyEngine
from .visualization import draw_detections


# ============================================================
# FastAPI Application
# ============================================================

app = FastAPI(
    title="TRINETRA API",
    description="AI-powered underwater sonar intelligence system",
    version="1.0.0",
)


# ============================================================
# CORS Configuration
# ============================================================

default_origins = [
    "https://trinetra-final.vercel.app",
    "https://trinetra-gilt.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

env_origins = os.getenv("CORS_ORIGINS", "")
custom_origins = [
    orig.strip().rstrip("/")
    for orig in env_origins.split(",")
    if orig.strip()
]

all_allowed_origins = list(dict.fromkeys(default_origins + custom_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=all_allowed_origins,
    # Matches any Vercel domain (production, preview branch, staging)
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# Root / Index Endpoint
# ============================================================

@app.get("/")
@app.head("/")
def root():
    return {
        "status": "online",
        "service": "TRINETRA Sonar Intelligence API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }


# ============================================================
# Load TRINETRA AI Components
# ============================================================

inference_engine = TrinetraInference()
anomaly_engine = TrinetraAnomalyEngine()


# ============================================================
# Health Check
# ============================================================

@app.get("/health")
@app.head("/health")
def health():
    return {
        "status": "ok",
        "service": "TRINETRA API",
        "model": "loaded",
        "anomaly_engine": "loaded",
    }


# ============================================================
# Complete TRINETRA Analysis
# ============================================================

@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):

    # --------------------------------------------------------
    # 1. Validate uploaded file
    # --------------------------------------------------------

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Please upload an image file.",
        )

    # --------------------------------------------------------
    # 2. Read uploaded image
    # --------------------------------------------------------

    image_bytes = await file.read()

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty.",
        )

    image_array = np.frombuffer(
        image_bytes,
        dtype=np.uint8,
    )

    image = cv2.imdecode(
        image_array,
        cv2.IMREAD_COLOR,
    )

    if image is None:
        raise HTTPException(
            status_code=400,
            detail="Could not decode the uploaded image.",
        )

    image_height, image_width = image.shape[:2]

    # --------------------------------------------------------
    # 3. Run YOLO detection
    # --------------------------------------------------------

    try:
        detections = inference_engine.detect(image)

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Model detection failed: {str(error)}",
        )

    final_detections = []

    known_like_count = 0
    review_required_count = 0
    anomaly_candidate_count = 0

    # --------------------------------------------------------
    # 4. Analyze every detected object
    # --------------------------------------------------------

    for detection in detections:

        x1, y1, x2, y2 = detection["bbox"]

        # Keep bounding box inside image boundaries
        x1 = max(0, int(x1))
        y1 = max(0, int(y1))
        x2 = min(image_width, int(x2))
        y2 = min(image_height, int(y2))

        # Ignore invalid bounding boxes
        if x2 <= x1 or y2 <= y1:
            continue

        # Extract object crop
        crop = image[y1:y2, x1:x2]

        if crop.size == 0:
            continue

        # ----------------------------------------------------
        # 5. Extract feature embedding
        # ----------------------------------------------------

        try:
            embedding = inference_engine.get_embedding(crop)

        except Exception as error:
            raise HTTPException(
                status_code=500,
                detail=f"Embedding extraction failed: {str(error)}",
            )

        # ----------------------------------------------------
        # 6. Run anomaly/evidence analysis
        # ----------------------------------------------------

        try:
            analysis = anomaly_engine.analyze_detection(
                yolo_class=detection["class_name"],
                yolo_confidence=detection["confidence"],
                embedding=embedding,
            )

        except Exception as error:
            raise HTTPException(
                status_code=500,
                detail=f"Anomaly analysis failed: {str(error)}",
            )

        status = analysis["status"]

        # ----------------------------------------------------
        # 7. Update summary counts
        # ----------------------------------------------------

        if status == "KNOWN_LIKE":
            known_like_count += 1

        elif status == "REVIEW_REQUIRED":
            review_required_count += 1

        elif status == "ANOMALY_CANDIDATE":
            anomaly_candidate_count += 1

        # ----------------------------------------------------
        # 8. Build final detection
        # ----------------------------------------------------

        final_detection = {
            "detection_id": detection["detection_id"],

            "yolo_class": detection["class_name"],
            "yolo_class_id": detection["class_id"],
            "yolo_confidence": detection["confidence"],

            "bbox": detection["bbox"],

            "feature_nearest_class": (
                analysis["feature_nearest_class"]
            ),

            "feature_similarity": (
                analysis["feature_similarity"]
            ),

            "class_baseline_p05": (
                analysis["class_baseline_p05"]
            ),

            "class_baseline_p10": (
                analysis["class_baseline_p10"]
            ),

            "models_agree": analysis["models_agree"],

            "similarity_status": (
                analysis["similarity_status"]
            ),

            "status": status,

            "human_verification_required": (
                analysis["human_verification_required"]
            ),
        }

        final_detections.append(final_detection)

    # --------------------------------------------------------
    # 9. Create annotated image
    # --------------------------------------------------------

    try:
        annotated_image = draw_detections(
            image,
            final_detections,
        )

        success, encoded_image = cv2.imencode(
            ".jpg",
            annotated_image,
        )

        if not success:
            raise ValueError(
                "OpenCV could not encode the annotated image."
            )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Image annotation failed: {str(error)}",
        )

    # --------------------------------------------------------
    # 10. Convert annotated image to Base64
    # --------------------------------------------------------

    annotated_base64 = base64.b64encode(
        encoded_image.tobytes()
    ).decode("utf-8")

    # Data URL allows React to display it directly
    annotated_image_url = (
        f"data:image/jpeg;base64,{annotated_base64}"
    )

    # --------------------------------------------------------
    # 11. Return complete TRINETRA response
    # --------------------------------------------------------

    return {
        "image": {
            "filename": file.filename,
            "width": image_width,
            "height": image_height,
        },

        "detection_count": len(final_detections),

        "known_like_count": known_like_count,

        "review_required_count": review_required_count,

        "anomaly_candidate_count": anomaly_candidate_count,

        "detections": final_detections,

        "annotated_image": annotated_image_url,
    }
