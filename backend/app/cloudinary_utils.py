import cloudinary
import cloudinary.uploader
import cloudinary.api
import os

# Get credentials from environment
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

# Only configure if credentials are available
if CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET:
    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=CLOUDINARY_API_KEY,
        api_secret=CLOUDINARY_API_SECRET,
        secure=True
    )
    CLOUDINARY_ENABLED = True
else:
    CLOUDINARY_ENABLED = False
    print("WARNING: Cloudinary credentials not found. File uploads will be disabled.")


def upload_to_cloudinary(file_bytes: bytes, filename: str) -> dict:
    """
    Upload file bất kỳ lên Cloudinary.
    Trả về dict có: secure_url, resource_type, format, bytes, public_id...
    """
    if not CLOUDINARY_ENABLED:
        raise ValueError("Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.")
    
    result = cloudinary.uploader.upload(
        file_bytes,
        public_id=filename.rsplit(".", 1)[0],
        resource_type="auto"   # auto = ảnh / video / file đều nhận
    )
    return result
