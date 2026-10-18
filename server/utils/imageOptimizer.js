const sharp = require("sharp");

const MAX_INCOMING_BYTES = 15 * 1024 * 1024; // 15 MB
const TARGET_OUTPUT_BYTES = 1024 * 1024; // 1 MB target
const MIN_QUALITY_FLOOR = 65; // Do not reduce quality below this to preserve visual fidelity
const MAX_DECOMPRESSION_PIXELS = 50 * 1000 * 1000; // 50 MP safety limit against decompression bombs

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp"
]);

const EXTENSIONS_BY_MIME = {
  "image/jpeg": new Set([".jpg", ".jpeg"]),
  "image/png": new Set([".png"]),
  "image/webp": new Set([".webp"])
};

const DIMENSION_LIMITS = {
  products: { maxWidth: 2048, maxHeight: 2048 },
  variants: { maxWidth: 2048, maxHeight: 2048 },
  categories: { maxWidth: 2048, maxHeight: 2048 },
  "user-profiles": { maxWidth: 512, maxHeight: 512 },
  "admin-profiles": { maxWidth: 512, maxHeight: 512 },
  returns: { maxWidth: 2048, maxHeight: 2048 },
  default: { maxWidth: 2048, maxHeight: 2048 }
};

/**
 * Validate byte signature against expected MIME types.
 */
function hasExpectedImageSignature(buffer, mimeType) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;

  if (mimeType === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (mimeType === "image/webp") {
    return (
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  return false;
}

/**
 * Detect MIME type directly from magic bytes.
 */
function detectMimeTypeFromBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return "image/png";
  }
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

/**
 * Comprehensive image buffer validation: checks size, magic bytes, and Sharp decoding safety.
 */
async function validateImageBuffer(buffer, declaredMimeType = null) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return { isValid: false, error: "Empty or invalid file buffer." };
  }

  if (buffer.length > MAX_INCOMING_BYTES) {
    return {
      isValid: false,
      error: `File size exceeds the 15 MB limit (${(buffer.length / (1024 * 1024)).toFixed(2)} MB).`
    };
  }

  const detectedMime = detectMimeTypeFromBuffer(buffer);
  if (!detectedMime || !ALLOWED_MIME_TYPES.has(detectedMime)) {
    return {
      isValid: false,
      error: "Only JPG, PNG, and WEBP images with valid signatures are allowed."
    };
  }

  if (declaredMimeType && declaredMimeType !== detectedMime) {
    return {
      isValid: false,
      error: "File extension or MIME type does not match image content."
    };
  }

  try {
    const image = sharp(buffer, {
      failOnError: true,
      limitInputPixels: MAX_DECOMPRESSION_PIXELS
    });
    const metadata = await image.metadata();

    if (!metadata || !metadata.width || !metadata.height) {
      return { isValid: false, error: "Unable to parse image dimensions." };
    }

    if (metadata.width > 12000 || metadata.height > 12000) {
      return {
        isValid: false,
        error: "Image dimensions exceed the maximum allowed limit (12000x12000)."
      };
    }

    return { isValid: true, metadata, detectedMimeType: detectedMime };
  } catch (err) {
    return {
      isValid: false,
      error: `Corrupt or unsupported image data: ${err.message}`
    };
  }
}

/**
 * Optimizes an image buffer using Sharp before uploading to Cloudinary.
 *
 * @param {Buffer} buffer - Original image buffer
 * @param {Object} options - Optimization options
 * @param {string} [options.folder='products'] - Upload folder/context (products, variants, categories, user-profiles, admin-profiles, returns)
 * @param {number} [options.targetBytes=1048576] - Target max size (default 1 MB)
 * @returns {Promise<Object>} Optimized buffer, format, dimensions, size, and statistics.
 */
async function optimizeImage(buffer, options = {}) {
  const folder = options.folder || "products";
  const targetBytes = options.targetBytes || TARGET_OUTPUT_BYTES;

  const validation = await validateImageBuffer(buffer);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const { metadata } = validation;
  const config = DIMENSION_LIMITS[folder] || DIMENSION_LIMITS.default;
  const hasAlpha = Boolean(metadata.hasAlpha);
  const isProfile = folder === "user-profiles" || folder === "admin-profiles";

  // Check if image is already WebP, within dimension limits, and already below target
  const alreadyWithinLimits =
    metadata.format === "webp" &&
    metadata.width <= config.maxWidth &&
    metadata.height <= config.maxHeight &&
    buffer.length <= targetBytes;

  if (alreadyWithinLimits) {
    return {
      buffer,
      format: "webp",
      mimeType: "image/webp",
      width: metadata.width,
      height: metadata.height,
      size: buffer.length,
      originalSize: buffer.length,
      compressionRatio: "0%",
      reachedTarget: true,
      attempts: 0
    };
  }

  // Define bounded step-down compression plan
  // Step 1: Initial high-quality encoding (quality 85) at configured max dimensions
  // Step 2: Quality 78, moderate dimension reduction if applicable
  // Step 3: Quality 72, dimension reduction if still above target
  // Step 4: Quality 65 (floor), max 1280px dimension
  const attemptsPlan = isProfile
    ? [
        { maxW: 512, maxH: 512, quality: 85, fit: "cover" },
        { maxW: 400, maxH: 400, quality: 78, fit: "cover" },
        { maxW: 320, maxH: 320, quality: 70, fit: "cover" }
      ]
    : [
        { maxW: config.maxWidth, maxH: config.maxHeight, quality: 85, fit: "inside" },
        { maxW: 1600, maxH: 1600, quality: 78, fit: "inside" },
        { maxW: 1440, maxH: 1440, quality: 72, fit: "inside" },
        { maxW: 1280, maxH: 1280, quality: MIN_QUALITY_FLOOR, fit: "inside" }
      ];

  let bestResult = null;
  let attemptCount = 0;

  for (const step of attemptsPlan) {
    attemptCount++;

    let pipeline = sharp(buffer, {
      failOnError: true,
      limitInputPixels: MAX_DECOMPRESSION_PIXELS
    }).rotate(); // Auto-rotate according to EXIF orientation

    const needResize =
      metadata.width > step.maxW ||
      metadata.height > step.maxH ||
      (isProfile && (metadata.width !== step.maxW || metadata.height !== step.maxH));

    if (needResize) {
      pipeline = pipeline.resize(step.maxW, step.maxH, {
        fit: step.fit,
        withoutEnlargement: !isProfile
      });
    }

    // WebP encoding preserves transparency if present, and offers superior compression
    pipeline = pipeline.webp({
      quality: Math.max(MIN_QUALITY_FLOOR, step.quality),
      alphaQuality: hasAlpha ? 90 : undefined,
      effort: 4
    });

    const candidateBuffer = await pipeline.toBuffer();

    bestResult = {
      buffer: candidateBuffer,
      format: "webp",
      mimeType: "image/webp",
      size: candidateBuffer.length,
      attempts: attemptCount
    };

    // If candidate reached target, we stop immediately to preserve maximum quality
    if (candidateBuffer.length <= targetBytes) {
      break;
    }
  }

  // Get final dimensions of the chosen output
  const finalMeta = await sharp(bestResult.buffer).metadata();
  const ratioNum = ((1 - bestResult.size / buffer.length) * 100);
  const compressionRatio = (ratioNum > 0 ? ratioNum.toFixed(1) : "0.0") + "%";

  return {
    buffer: bestResult.buffer,
    format: "webp",
    mimeType: "image/webp",
    width: finalMeta.width,
    height: finalMeta.height,
    size: bestResult.size,
    originalSize: buffer.length,
    compressionRatio,
    reachedTarget: bestResult.size <= targetBytes,
    attempts: attemptCount
  };
}

module.exports = {
  MAX_INCOMING_BYTES,
  TARGET_OUTPUT_BYTES,
  MIN_QUALITY_FLOOR,
  ALLOWED_MIME_TYPES,
  EXTENSIONS_BY_MIME,
  DIMENSION_LIMITS,
  hasExpectedImageSignature,
  detectMimeTypeFromBuffer,
  validateImageBuffer,
  optimizeImage
};
