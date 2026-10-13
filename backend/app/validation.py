import hashlib
import io
from typing import Tuple
from PIL import Image, UnidentifiedImageError
from fastapi import HTTPException, UploadFile, status

# Limits & Safeguards
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB limit

# Image decompression bomb defense: limit maximum allowed pixel count
Image.MAX_IMAGE_PIXELS = 89_478_485


def compute_sha256(data: bytes) -> str:
    """Computes exact SHA-256 cryptographic hexadecimal digest of byte payload."""
    hasher = hashlib.sha256()
    hasher.update(data)
    return hasher.hexdigest()


def verify_magic_bytes(data: bytes) -> str:
    """
    Validates true file signature (magic bytes) to prevent extension spoofing.
    Returns detected format or raises HTTPException.
    """
    if len(data) < 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is too small to be a valid image container."
        )

    # JPEG: starts with FF D8 FF
    if data.startswith(b"\xff\xd8\xff"):
        return "JPEG"

    # PNG: starts with 89 50 4E 47 0D 0A 1A 0A
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "PNG"

    # WEBP: RIFF + 4 bytes + WEBP
    if data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        return "WEBP"

    raise HTTPException(
        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        detail="Unsupported file format. Only true JPEG, PNG, and WebP images are permitted."
    )


async def validate_and_load_image(file: UploadFile) -> Tuple[Image.Image, bytes, str, str]:
    """
    Thoroughly inspects and decodes an incoming uploaded image file.
    Performs:
    1. Size boundary enforcement (<= 50 MB).
    2. Magic bytes validation.
    3. Structural image verification via PIL.
    4. Safe RGB conversion.
    
    Returns:
        (pil_image_rgb, raw_bytes, sha256_hash, dimensions_str)
    """
    # Read payload
    try:
        contents = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read file payload: {str(e)}"
        )

    if not contents or len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes)."
        )

    # Enforce size limit
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"File exceeds maximum allowed limit of {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB."
        )

    # Enforce magic bytes
    verify_magic_bytes(contents)

    # Compute SHA-256
    file_sha256 = compute_sha256(contents)

    # Structural verification with PIL
    try:
        # First verify container integrity
        verify_stream = io.BytesIO(contents)
        temp_img = Image.open(verify_stream)
        temp_img.verify()

        # Reopen for actual pixel operations (as verify() invalidates the object)
        decode_stream = io.BytesIO(contents)
        img = Image.open(decode_stream)
        
        # Guard against zero-dimension images
        width, height = img.size
        if width <= 0 or height <= 0:
            raise ValueError("Invalid image dimensions (<= 0).")

        dimensions_str = f"{width} × {height}"

        # Standardize color space to RGB
        if img.mode != "RGB":
            img = img.convert("RGB")

        return img, contents, file_sha256, dimensions_str

    except (UnidentifiedImageError, ValueError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Corrupt or unreadable image data: {str(e)}"
        )
    except Image.DecompressionBombError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Decompression bomb detected. Image resolution is excessively large."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image decoding failed: {str(e)}"
        )
