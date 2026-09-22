const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadRoot = path.join(__dirname, "..", "uploads");
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const extensionsByMime = {
  "image/jpeg": new Set([".jpg", ".jpeg"]),
  "image/png": new Set([".png"]),
  "image/webp": new Set([".webp"])
};
const cloudinaryFolderPrefix = "haroon-stores";

function storageProvider() {
  return String(process.env.STORAGE_PROVIDER || "local").trim().toLowerCase();
}

function isCloudinaryStorage() {
  return storageProvider() === "cloudinary";
}

function getCloudinary() {
  if (!isCloudinaryStorage()) return null;

  const required = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"];
  const missing = required.filter(name => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Cloudinary storage requires: ${missing.join(", ")}`);
  }

  const { v2: cloudinary } = require("cloudinary");
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
  return cloudinary;
}

function ensureFolder(folder) {
  fs.mkdirSync(path.join(uploadRoot, folder), {
    recursive: true
  });
}

function createImageUpload(folder, maxFiles = 8, fieldFolders = {}) {
  const provider = storageProvider();
  if (provider !== "local" && provider !== "cloudinary") {
    throw new Error("STORAGE_PROVIDER must be either 'local' or 'cloudinary'.");
  }

  if (provider === "cloudinary") getCloudinary();

  if (provider === "local") {
    ensureFolder(folder);
    Object.values(fieldFolders).forEach(ensureFolder);
  }
  const storage = provider === "cloudinary" ? multer.memoryStorage() : multer.diskStorage({
    destination(req, file, callback) {
      callback(null, path.join(uploadRoot, fieldFolders[file.fieldname] || folder));
    },
    filename(req, file, callback) {
      const extension = path.extname(file.originalname).toLowerCase();
      const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
      callback(null, safeName);
    }
  });

  return multer({
    storage,
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: maxFiles,
      fieldSize: 50 * 1024 * 1024
    },
    fileFilter(req, file, callback) {
      const extension = path.extname(file.originalname).toLowerCase();
      if (!allowedTypes.has(file.mimetype) || !extensionsByMime[file.mimetype]?.has(extension)) {
        return callback(new Error("Only JPG, PNG, and WEBP images are allowed."));
      }

      callback(null, true);
    }
  });
}

function hasExpectedImageSignature(buffer, mimeType) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;
  if (mimeType === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === "image/webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  return false;
}

function uploadedFiles(req, fieldName = null) {
  if (req.file) return [req.file];
  if (Array.isArray(req.files)) return req.files;
  if (fieldName) return req.files?.[fieldName] || [];
  return Object.values(req.files || {}).flat();
}

function validateUploadedImages(req, res, next) {
  const files = uploadedFiles(req);
  try {
    for (const file of files) {
      const bytes = file.buffer || fs.readFileSync(file.path);
      if (!hasExpectedImageSignature(bytes, file.mimetype)) {
        if (file.path) fs.unlinkSync(file.path);
        return res.status(400).json({ success: false, message: "Invalid image file content." });
      }
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

function uploadToCloudinary(file, folder) {
  const cloudinary = getCloudinary();
  const publicId = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder: `${cloudinaryFolderPrefix}/${folder}`,
      public_id: publicId,
      resource_type: "image",
      overwrite: false
    }, (error, result) => error ? reject(error) : resolve(result.secure_url));
    stream.end(file.buffer);
  });
}

async function uploadedImagePaths(req, folder, fieldName = null) {
  const files = uploadedFiles(req, fieldName);

  if (isCloudinaryStorage()) {
    return Promise.all(files.map(file => uploadToCloudinary(file, folder)));
  }

  return files.map(file =>
    `/uploads/${path.basename(path.dirname(file.path))}/${file.filename}`
  );
}

function cloudinaryPublicIdFromUrl(imageUrl) {
  try {
    const url = new URL(imageUrl);
    const marker = "/image/upload/";
    const markerIndex = url.pathname.indexOf(marker);
    if (!url.hostname.endsWith("cloudinary.com") || markerIndex === -1) return null;

    let assetPath = url.pathname.slice(markerIndex + marker.length).replace(/^v\d+\//, "");
    if (!assetPath.startsWith(`${cloudinaryFolderPrefix}/`)) return null;

    assetPath = decodeURIComponent(assetPath).replace(/\.[^/.]+$/, "");
    return assetPath || null;
  } catch {
    return null;
  }
}

async function deleteCloudinaryImages(imageUrls) {
  if (!isCloudinaryStorage()) return;

  const cloudinary = getCloudinary();
  const publicIds = [...new Set(imageUrls.map(cloudinaryPublicIdFromUrl).filter(Boolean))];
  const results = await Promise.allSettled(publicIds.map(publicId =>
    cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true })
  ));

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(`Cloudinary deletion failed for ${publicIds[index]}:`, result.reason);
    }
  });
}

module.exports = {
  createImageUpload,
  uploadedImagePaths,
  deleteCloudinaryImages,
  validateUploadedImages
};
