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
const {
  validateImageBuffer,
  optimizeImage
} = require("../utils/imageOptimizer");

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
      fileSize: 15 * 1024 * 1024,
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

function cleanupUploadedFiles(files) {
  if (!Array.isArray(files)) return;
  for (const file of files) {
    if (file && file.path) {
      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (err) {
        console.error(`Failed to clean up uploaded file ${file.path}:`, err.message);
      }
    }
  }
}

async function validateUploadedImages(req, res, next) {
  const files = uploadedFiles(req);
  try {
    for (const file of files) {
      const bytes = file.buffer || fs.readFileSync(file.path);
      const validation = await validateImageBuffer(bytes, file.mimetype);
      if (!validation.isValid) {
        cleanupUploadedFiles(files);
        return res.status(400).json({
          success: false,
          message: validation.error || "Invalid image file content."
        });
      }
    }
    return next();
  } catch (error) {
    cleanupUploadedFiles(files);
    return next(error);
  }
}

function streamBufferToCloudinary(cloudinary, buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result.secure_url);
    });
    stream.end(buffer);
  });
}

async function uploadToCloudinary(file, folder) {
  const cloudinary = getCloudinary();
  const baseId = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

  // Special handling for return dispute evidence:
  // Dual-upload: preserve full uncompressed original + generate compressed WebP preview
  if (folder === "returns") {
    const originalPublicId = `${cloudinaryFolderPrefix}/${folder}/original-${baseId}`;
    const previewPublicId = `${cloudinaryFolderPrefix}/${folder}/preview-${baseId}`;
    const uploadedPublicIds = [];

    // Step 1: In-memory optimization first. If this fails, no network requests are made.
    const optimized = await optimizeImage(file.buffer, { folder: "returns" });

    // Step 2: Upload streams with individual success tracking
    const originalPromise = streamBufferToCloudinary(cloudinary, file.buffer, {
      folder: `${cloudinaryFolderPrefix}/${folder}`,
      public_id: `original-${baseId}`,
      resource_type: "image",
      overwrite: false
    }).then(url => {
      uploadedPublicIds.push(originalPublicId);
      return url;
    });

    const previewPromise = streamBufferToCloudinary(cloudinary, optimized.buffer, {
      folder: `${cloudinaryFolderPrefix}/${folder}`,
      public_id: `preview-${baseId}`,
      resource_type: "image",
      format: optimized.format || "webp",
      overwrite: false
    }).then(url => {
      uploadedPublicIds.push(previewPublicId);
      return url;
    });

    const settled = await Promise.allSettled([
      originalPromise,
      previewPromise
    ]);

    const firstRejected = settled.find(item => item.status === "rejected");
    if (firstRejected) {
      // Both in-flight streams have settled completely before cleanup runs
      if (uploadedPublicIds.length > 0) {
        try {
          const destroyResults = await Promise.allSettled(
            uploadedPublicIds.map(id =>
              cloudinary.uploader.destroy(id, { resource_type: "image", invalidate: true })
            )
          );
          destroyResults.forEach((result, idx) => {
            if (result.status === "rejected") {
              console.error(`Failed to clean up Cloudinary return asset ${uploadedPublicIds[idx]}:`, result.reason);
            }
          });
        } catch (cleanupError) {
          console.error("Failed during Cloudinary return cleanup:", cleanupError);
        }
      }
      throw firstRejected.reason;
    }

    return JSON.stringify({
      preview: settled[1].value,
      original: settled[0].value
    });
  }

  // Standard flow: compress before uploading to Cloudinary
  const optimized = await optimizeImage(file.buffer, { folder });

  return streamBufferToCloudinary(cloudinary, optimized.buffer, {
    folder: `${cloudinaryFolderPrefix}/${folder}`,
    public_id: baseId,
    resource_type: "image",
    format: optimized.format || "webp",
    overwrite: false
  });
}

async function uploadedImagePaths(req, folder, fieldName = null) {
  const files = uploadedFiles(req, fieldName);

  if (isCloudinaryStorage()) {
    const uploadedResults = [];
    const settled = await Promise.allSettled(
      files.map(async file => {
        const uploadedUrl = await uploadToCloudinary(file, folder);
        uploadedResults.push(uploadedUrl);
        return uploadedUrl;
      })
    );

    const firstRejected = settled.find(item => item.status === "rejected");
    if (firstRejected) {
      // All in-flight Cloudinary uploads have completely settled before rollback runs
      if (uploadedResults.length > 0) {
        try {
          await deleteCloudinaryImages(uploadedResults);
        } catch (cleanupErr) {
          console.error("Failed to clean up partial Cloudinary batch uploads:", cleanupErr);
        }
      }
      throw firstRejected.reason;
    }

    return settled.map(item => item.value);
  }

  // Local storage provider handling
  const createdLocalFiles = [];
  const filesToUnlinkOnSuccess = [];

  const settled = await Promise.allSettled(
    files.map(async file => {
      const rawBuffer = fs.readFileSync(file.path);
      const dir = path.dirname(file.path);
      const ext = path.extname(file.filename);
      const subfolder = path.basename(dir);

      if (folder === "returns") {
        const optimized = await optimizeImage(rawBuffer, { folder: "returns" });
        const previewFileName = `preview-${path.basename(file.filename, ext)}.webp`;
        const previewFilePath = path.join(dir, previewFileName);

        fs.writeFileSync(previewFilePath, optimized.buffer);
        createdLocalFiles.push(previewFilePath);

        return JSON.stringify({
          preview: `/uploads/${subfolder}/${previewFileName}`,
          original: `/uploads/${subfolder}/${file.filename}`
        });
      }

      const optimized = await optimizeImage(rawBuffer, { folder });
      const webpFileName = `${path.basename(file.filename, ext)}.webp`;
      const webpFilePath = path.join(dir, webpFileName);

      fs.writeFileSync(webpFilePath, optimized.buffer);
      if (webpFilePath !== file.path) {
        createdLocalFiles.push(webpFilePath);
        filesToUnlinkOnSuccess.push(file.path);
      }

      return `/uploads/${subfolder}/${webpFileName}`;
    })
  );

  const firstRejected = settled.find(item => item.status === "rejected");

  if (firstRejected) {
    // If any item failed in the local batch, clean up all files created during this operation
    for (const createdPath of createdLocalFiles) {
      try {
        if (fs.existsSync(createdPath)) {
          fs.unlinkSync(createdPath);
        }
      } catch (cleanupErr) {
        console.error(`Failed to clean up created local file ${createdPath}:`, cleanupErr.message);
      }
    }
    throw firstRejected.reason;
  }

  // On full batch success, clean up original raw files that were converted to WebP
  for (const originalPath of filesToUnlinkOnSuccess) {
    try {
      if (fs.existsSync(originalPath)) {
        fs.unlinkSync(originalPath);
      }
    } catch (unlinkErr) {
      console.error(`Failed to unlink temporary original file ${originalPath}:`, unlinkErr.message);
    }
  }

  return settled.map(item => item.value);
}

function cloudinaryPublicIdFromUrl(imageUrl) {
  try {
    const url = new URL(imageUrl);
    const marker = "/image/upload/";
    const markerIndex = url.pathname.indexOf(marker);
    if (!url.hostname.endsWith("cloudinary.com") || markerIndex === -1) return null;

    const afterMarker = url.pathname.slice(markerIndex + marker.length);
    const prefixIndex = afterMarker.indexOf(`${cloudinaryFolderPrefix}/`);
    if (prefixIndex === -1) return null;

    let assetPath = afterMarker.slice(prefixIndex);
    assetPath = decodeURIComponent(assetPath).replace(/\.[^/.]+$/, "");
    return assetPath || null;
  } catch {
    return null;
  }
}

function extractImageUrls(entry) {
  if (!entry) return [];
  if (Array.isArray(entry)) {
    return entry.flatMap(extractImageUrls);
  }
  if (typeof entry === "object") {
    return [entry.preview, entry.original, entry.url].filter(Boolean);
  }
  if (typeof entry === "string") {
    const trimmed = entry.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        return [parsed.preview, parsed.original, parsed.url].filter(Boolean);
      } catch {
        // Fall back to treat as raw string URL
      }
    }
    return [trimmed];
  }
  return [];
}

async function deleteCloudinaryImages(imageUrls) {
  const rawList = Array.isArray(imageUrls) ? imageUrls : [imageUrls];
  const allUrls = rawList.flatMap(extractImageUrls);
  if (allUrls.length === 0) return;

  if (!isCloudinaryStorage()) {
    allUrls.forEach(url => {
      if (typeof url === "string" && url.startsWith("/uploads/")) {
        const cleanPath = url.replace(/^\/uploads\//, "");
        if (cleanPath.includes("..") || path.isAbsolute(cleanPath)) {
          return;
        }
        const resolvedPath = path.resolve(uploadRoot, cleanPath);
        const relative = path.relative(uploadRoot, resolvedPath);
        const isContained = relative && !relative.startsWith("..") && !path.isAbsolute(relative);
        if (isContained && fs.existsSync(resolvedPath)) {
          try {
            fs.unlinkSync(resolvedPath);
          } catch (err) {
            console.error(`Failed to delete local image ${resolvedPath}:`, err.message);
          }
        }
      }
    });
    return;
  }

  const cloudinary = getCloudinary();
  const publicIds = [...new Set(allUrls.map(cloudinaryPublicIdFromUrl).filter(Boolean))];
  if (publicIds.length === 0) return;

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
  validateUploadedImages,
  uploadToCloudinary
};
