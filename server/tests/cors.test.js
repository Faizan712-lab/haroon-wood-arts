const assert = require("node:assert/strict");
const test = require("node:test");
const express = require("express");
const cors = require("cors");
const { getAllowedOrigins, createCorsOptions } = require("../middleware/corsConfig");

const PREVIEW_ORIGIN = "https://haroon-wood-arts-git-seo-improvements-haroon-stores.vercel.app";
const PRODUCTION_ORIGINS = "https://haroonstores.in,https://www.haroonstores.in";

function listen(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
    server.once("error", reject);
  });
}

test("allowlist includes the Preview origin and preserves production origins", () => {
  const allowedOrigins = getAllowedOrigins(PRODUCTION_ORIGINS, true);

  assert.ok(allowedOrigins.includes(PREVIEW_ORIGIN));
  assert.ok(allowedOrigins.includes("https://haroonstores.in"));
  assert.ok(allowedOrigins.includes("https://www.haroonstores.in"));
  assert.equal(allowedOrigins.includes("https://unrelated.example"), false);
});

test("production still requires CLIENT_ORIGIN", () => {
  assert.throws(
    () => getAllowedOrigins("", true),
    /CLIENT_ORIGIN must list the production frontend origin/,
  );
});

test("OPTIONS preflight grants the Preview origin existing CORS permissions", async t => {
  const allowedOrigins = getAllowedOrigins(PRODUCTION_ORIGINS, true);
  const app = express();
  app.use(cors(createCorsOptions(allowedOrigins)));
  app.get("/api/test", (req, res) => res.json({ success: true }));
  app.use((error, req, res, next) => res.status(500).end());

  const server = await listen(app);
  t.after(() => new Promise(resolve => server.close(resolve)));
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/test`, {
    method: "OPTIONS",
    headers: {
      Origin: PREVIEW_ORIGIN,
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "authorization,content-type"
    }
  });

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), PREVIEW_ORIGIN);
  assert.equal(response.headers.get("access-control-allow-credentials"), "true");
  assert.match(response.headers.get("access-control-allow-methods") || "", /GET/);
  assert.equal(
    response.headers.get("access-control-allow-headers"),
    "authorization,content-type"
  );
});

test("OPTIONS preflight does not grant access to an unrelated origin", async t => {
  const allowedOrigins = getAllowedOrigins(PRODUCTION_ORIGINS, true);
  const app = express();
  app.use(cors(createCorsOptions(allowedOrigins)));
  app.use((error, req, res, next) => res.status(500).end());

  const server = await listen(app);
  t.after(() => new Promise(resolve => server.close(resolve)));
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/test`, {
    method: "OPTIONS",
    headers: {
      Origin: "https://unrelated.example",
      "Access-Control-Request-Method": "GET"
    }
  });

  assert.equal(response.headers.has("access-control-allow-origin"), false);
});
