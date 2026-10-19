const PREVIEW_ORIGIN = "https://haroon-wood-arts-git-seo-improvements-haroon-stores.vercel.app";
const DEVELOPMENT_ORIGINS = "http://localhost:5173,http://192.168.1.16:5173";

function getAllowedOrigins(configuredOrigins, isProduction) {
  const originList = configuredOrigins || (
    isProduction ? "" : DEVELOPMENT_ORIGINS
  );
  const configured = originList
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);

  if (isProduction && configured.length === 0) {
    throw new Error("CLIENT_ORIGIN must list the production frontend origin(s).");
  }

  return [...new Set([...configured, PREVIEW_ORIGIN])];
}

function createCorsOptions(allowedOrigins) {
  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  };
}

module.exports = {
  createCorsOptions,
  getAllowedOrigins
};
