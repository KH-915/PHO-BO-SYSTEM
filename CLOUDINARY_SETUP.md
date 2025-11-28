# Cloudinary Setup Guide

The application uses Cloudinary for file uploads (images, videos, and other files). Follow these steps to configure it:

## 1. Create a Cloudinary Account

1. Go to https://cloudinary.com/
2. Sign up for a free account
3. After signing up, you'll be redirected to your dashboard

## 2. Get Your Credentials

On your Cloudinary dashboard, you'll see:
- **Cloud Name**
- **API Key**
- **API Secret**

## 3. Configure Backend

1. Navigate to the `backend` folder
2. Create a `.env` file (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` and add your Cloudinary credentials:
   ```env
   CLOUDINARY_CLOUD_NAME=your_cloud_name_here
   CLOUDINARY_API_KEY=your_api_key_here
   CLOUDINARY_API_SECRET=your_api_secret_here
   ```

4. Restart the backend server:
   ```bash
   # Stop the current server (Ctrl+C)
   # Then restart:
   uvicorn app.main:app --reload
   ```

## 4. Test File Upload

1. Go to the feed page
2. Click "Ảnh/Video" button
3. Select an image or video
4. Create a post
5. The file should upload successfully and display in your post

## Troubleshooting

### "File upload service unavailable"
- Make sure you've created the `.env` file in the `backend` folder
- Verify your Cloudinary credentials are correct
- Restart the backend server after adding credentials

### "Must supply api_key"
- The `.env` file is not being loaded
- Make sure the `.env` file is in the `backend` folder (not `backend/app`)
- Check that python-dotenv is installed: `pip install python-dotenv`

## Free Tier Limits

Cloudinary free tier includes:
- 25 GB storage
- 25 GB monthly bandwidth
- 25 credits/month for transformations

This should be more than enough for development and testing!

## Alternative: Disable File Uploads

If you don't want to set up Cloudinary right now, the app will still work for text-only posts. Users will see a message if they try to upload files without Cloudinary configured.
