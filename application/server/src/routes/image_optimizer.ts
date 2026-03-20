import { promises as fs } from "fs";
import path from "path";

import { Router } from "express";
import sharp from "sharp";

import { PUBLIC_PATH, UPLOAD_PATH } from "@web-speed-hackathon-2026/server/src/paths";

const CACHE_DIR = path.resolve(PUBLIC_PATH, "../.image-cache");

async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

async function findImageFile(relativePath: string): Promise<string | null> {
  for (const base of [UPLOAD_PATH, PUBLIC_PATH]) {
    const fullPath = path.resolve(base, relativePath);
    try {
      await fs.access(fullPath);
      return fullPath;
    } catch {
      // continue
    }
  }
  return null;
}

export const imageOptimizerRouter = Router();

// Intercept requests for image files and serve optimized versions
imageOptimizerRouter.get(/^\/(images\/.+\.jpg)$/, async (req, res, next) => {
  const relativePath = req.params[0];
  if (!relativePath) {
    return next();
  }

  const width = req.query.w ? parseInt(req.query.w as string, 10) : undefined;
  const format = (req.query.format as string) || "webp";

  if (!width && format === "jpg") {
    return next();
  }

  const originalPath = await findImageFile(relativePath);
  if (!originalPath) {
    return next();
  }

  // Build cache key
  const cacheKey = `${relativePath.replace(/\//g, "_")}_w${width || "orig"}_${format}`;
  const cachePath = path.resolve(CACHE_DIR, cacheKey);

  try {
    // Try serving from cache
    const cached = await fs.readFile(cachePath);
    const contentType = format === "avif" ? "image/avif" : format === "webp" ? "image/webp" : "image/jpeg";
    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    return res.send(cached);
  } catch {
    // Cache miss, process image
  }

  try {
    await ensureCacheDir();

    let pipeline = sharp(originalPath);

    if (width) {
      pipeline = pipeline.resize({ width, withoutEnlargement: true });
    }

    if (format === "avif") {
      pipeline = pipeline.avif({ quality: 50 });
    } else if (format === "webp") {
      pipeline = pipeline.webp({ quality: 75 });
    } else {
      pipeline = pipeline.jpeg({ quality: 75, mozjpeg: true });
    }

    const buffer = await pipeline.toBuffer();

    // Write to cache (fire and forget)
    fs.writeFile(cachePath, buffer).catch(() => {});

    const contentType = format === "avif" ? "image/avif" : format === "webp" ? "image/webp" : "image/jpeg";
    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    return res.send(buffer);
  } catch (err) {
    console.error("Image optimization error:", err);
    return next();
  }
});
