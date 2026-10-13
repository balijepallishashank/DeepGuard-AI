import os
import io
import pytest
import numpy as np
import cv2
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def create_dummy_video_bytes(num_frames: int = 10, fps: int = 10, width: int = 64, height: int = 64) -> bytes:
    """
    Creates a small valid MP4 video in memory using OpenCV for testing.
    """
    import tempfile
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            temp_path = tmp.name

        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(temp_path, fourcc, fps, (width, height))

        for i in range(num_frames):
            # Create a simple colored frame
            color = (int(i * 20) % 255, 128, 200)
            frame = np.full((height, width, 3), color, dtype=np.uint8)
            out.write(frame)

        out.release()

        with open(temp_path, 'rb') as f:
            video_bytes = f.read()
        return video_bytes
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


def test_video_invalid_extension():
    response = client.post(
        "/api/v1/analyze/video",
        files={"file": ("test_doc.pdf", b"pdf content", "application/pdf")}
    )
    assert response.status_code == 415
    assert "Unsupported video extension" in response.json()["detail"]


def test_video_empty_file():
    response = client.post(
        "/api/v1/analyze/video",
        files={"file": ("empty.mp4", b"", "video/mp4")}
    )
    assert response.status_code == 400
    assert "empty" in response.json()["detail"]


def test_video_oversized_file():
    # 51 MB dummy payload header simulation
    oversized_data = b"0" * (51 * 1024 * 1024)
    response = client.post(
        "/api/v1/analyze/video",
        files={"file": ("large_video.mp4", oversized_data, "video/mp4")}
    )
    assert response.status_code == 413
    assert "exceeds maximum limit" in response.json()["detail"]


def test_valid_video_inference():
    video_bytes = create_dummy_video_bytes(num_frames=15, fps=10)
    assert len(video_bytes) > 0

    response = client.post(
        "/api/v1/analyze/video",
        files={"file": ("test_clip.mp4", video_bytes, "video/mp4")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["filename"] == "test_clip.mp4"
    assert data["sampled_frames_count"] > 0
    assert "video_classification" in data
    assert "fake_probability_percentage" in data
    assert isinstance(data["frame_results"], list)
    assert len(data["frame_results"]) == data["sampled_frames_count"]

    # Check keyframe structure
    first_frame = data["frame_results"][0]
    assert "frame_index" in first_frame
    assert "timestamp_sec" in first_frame
    assert "predicted_label" in first_frame
    assert "scores" in first_frame
    assert "Trimmed-Consensus" in data.get("analysis_type", "")
    assert "trimmed-median" in data.get("methodology_disclaimer", "")
