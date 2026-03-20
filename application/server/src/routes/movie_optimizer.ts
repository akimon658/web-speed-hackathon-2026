import { execFile } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";

import { Router } from "express";

import { PUBLIC_PATH, UPLOAD_PATH } from "@web-speed-hackathon-2026/server/src/paths";

const execFileAsync = promisify(execFile);

const CACHE_DIR = path.resolve(PUBLIC_PATH, "../.movie-cache");

async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

async function findMovieFile(relativePath: string): Promise<string | null> {
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

export const movieOptimizerRouter = Router();

movieOptimizerRouter.get(/^\/(movies\/.+\.gif)$/, async (req, res, next) => {
  const relativePath = req.params[0];
  if (!relativePath) {
    return next();
  }

  const width = req.query["w"] ? parseInt(req.query["w"] as string, 10) : undefined;
  const format = (req.query["format"] as string) || "mp4";

  // No optimization requested, serve original
  if (!width && format === "gif") {
    return next();
  }

  const originalPath = await findMovieFile(relativePath);
  if (!originalPath) {
    return next();
  }

  // Build cache key
  const cacheKey = `${relativePath.replace(/\//g, "_")}_w${width || "orig"}_${format}`;
  const cachePath = path.resolve(CACHE_DIR, cacheKey);

  try {
    // Try serving from cache
    const cached = await fs.readFile(cachePath);
    const contentType = format === "webm" ? "video/webm" : "video/mp4";
    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    return res.send(cached);
  } catch {
    // Cache miss, process movie
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "movie-opt-"));
  const ext = format === "webm" ? "webm" : "mp4";
  const tmpOutput = path.join(tmpDir, `output.${ext}`);

  try {
    await ensureCacheDir();

    const vfFilters: string[] = [];
    if (width) {
      vfFilters.push(`scale=${width}:-2`);
    }

    const ffmpegArgs: string[] = ["-i", originalPath];

    if (vfFilters.length > 0) {
      ffmpegArgs.push("-vf", vfFilters.join(","));
    }

    if (format === "webm") {
      ffmpegArgs.push("-c:v", "libvpx-vp9", "-crf", "35", "-b:v", "0");
    } else {
      ffmpegArgs.push(
        "-movflags", "+faststart",
        "-pix_fmt", "yuv420p",
        "-c:v", "libx264",
        "-crf", "28",
        "-preset", "fast",
      );
    }

    ffmpegArgs.push("-an", "-y", tmpOutput);

    await execFileAsync("ffmpeg", ffmpegArgs);

    const buffer = await fs.readFile(tmpOutput);

    // Write to cache (fire and forget)
    fs.writeFile(cachePath, buffer).catch(() => {});

    const contentType = format === "webm" ? "video/webm" : "video/mp4";
    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    return res.send(buffer);
  } catch (err) {
    console.error("Movie optimization error:", err);
    return next();
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
});
