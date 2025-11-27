import cloudinary
import cloudinary.uploader
import cloudinary.api
import os

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)


def upload_to_cloudinary(file_bytes: bytes, filename: str) -> dict:
    """
    Upload file bất kỳ lên Cloudinary.
    Trả về dict có: secure_url, resource_type, format, bytes, public_id...
    """
    result = cloudinary.uploader.upload(
        file_bytes,
        public_id=filename.rsplit(".", 1)[0],
        resource_type="auto"   # auto = ảnh / video / file đều nhận
    )
    return result
