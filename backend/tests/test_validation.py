import io
import pytest
from PIL import Image
from fastapi import HTTPException, UploadFile
from app.validation import validate_and_load_image, compute_sha256, verify_magic_bytes


def create_test_image_bytes(format="JPEG", size=(64, 64), color=(255, 0, 0)) -> bytes:
    """Generates a real valid in-memory image for testing."""
    buf = io.BytesIO()
    img = Image.new("RGB", size, color)
    img.save(buf, format=format)
    return buf.getvalue()


@pytest.mark.anyio
async def test_valid_jpeg_validation():
    jpeg_bytes = create_test_image_bytes("JPEG")
    upload = UploadFile(filename="test.jpg", file=io.BytesIO(jpeg_bytes))
    
    img, raw_bytes, sha256_hash, dimensions = await validate_and_load_image(upload)
    assert img.size == (64, 64)
    assert len(raw_bytes) == len(jpeg_bytes)
    assert sha256_hash == compute_sha256(jpeg_bytes)
    assert dimensions == "64 × 64"


@pytest.mark.anyio
async def test_valid_png_validation():
    png_bytes = create_test_image_bytes("PNG")
    upload = UploadFile(filename="test.png", file=io.BytesIO(png_bytes))
    
    img, raw_bytes, sha256_hash, dimensions = await validate_and_load_image(upload)
    assert img.size == (64, 64)
    assert len(raw_bytes) == len(png_bytes)
    assert dimensions == "64 × 64"


@pytest.mark.anyio
async def test_empty_file_rejected():
    upload = UploadFile(filename="empty.jpg", file=io.BytesIO(b""))
    with pytest.raises(HTTPException) as exc_info:
        await validate_and_load_image(upload)
    assert exc_info.value.status_code == 400
    assert "empty" in exc_info.value.detail.lower()


@pytest.mark.anyio
async def test_unsupported_format_rejected():
    text_data = b"This is plain text pretending to be an image."
    upload = UploadFile(filename="fake.jpg", file=io.BytesIO(text_data))
    with pytest.raises(HTTPException) as exc_info:
        await validate_and_load_image(upload)
    assert exc_info.value.status_code == 415


@pytest.mark.anyio
async def test_corrupt_image_rejected():
    # Valid JPEG header but corrupt trailing pixel data
    corrupt_data = b"\xff\xd8\xff\xe0" + b"\x00" * 20
    upload = UploadFile(filename="corrupt.jpg", file=io.BytesIO(corrupt_data))
    with pytest.raises(HTTPException) as exc_info:
        await validate_and_load_image(upload)
    assert exc_info.value.status_code == 400
