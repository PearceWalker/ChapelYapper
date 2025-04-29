// src/pages/api/upload.js or /libraries/upload.js (wherever you keep it)

import cloudinary from 'cloudinary';

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadImage(base64Image) {
  try {
    const res = await cloudinary.v2.uploader.upload(base64Image, {
      folder: "chap_yapper_pulse",
    });
    return res.secure_url;
  } catch (err) {
    console.error("Cloudinary upload failed:", err);
    throw err;
  }
}
