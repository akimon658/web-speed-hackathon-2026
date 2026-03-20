import { execFile } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { promisify } from "util";

import { Router } from "express";

import { PUBLIC_PATH, UPLOAD_PATH } from "@web-speed-hackathon-2026/server/src/paths";

const execFileAsync = promisify(execFile);

const CACHE_DIR = path.resolve(PUBLIC_PATH, "../.sound-cache");

async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

async function findSoundFile(relativePath: string): Promise<string | null> {
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

async function computePeaks(filePath: string): Promise<{ peaks: number[]; max: number }> {
  // Use FFmpeg to extract raw PCM float32 mono audio at a low sample rate
  const { stdout } = await execFileAsync(
    "ffmpeg",
    ["-i", filePath, "-f", "f32le", "-ac", "1", "-ar", "8000", "pipe:1"],
    { encoding: "buffer", maxBuffer: 50 * 1024 * 1024 },
  );

  const samples = new Float32Array(stdout.buffer, stdout.byteOffset, stdout.byteLength / 4);

  // Take absolute values and split into 100 chunks
  const chunkSize = Math.ceil(samples.length / 100);
  const peaks: number[] = [];

  for (let i = 0; i < 100; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, samples.length);
    let sum = 0;
    let count = 0;
    for (let j = start; j < end; j++) {
      sum += Math.abs(samples[j]!);
      count++;
    }
    peaks.push(count > 0 ? sum / count : 0);
  }

  const max = Math.max(...peaks, 0);

  return { peaks, max };
}

export const soundPeaksRouter = Router();

soundPeaksRouter.get(/^\/(sounds\/.+\.mp3)$/, async (req, res, next) => {
  // Only handle requests with ?peaks query parameter
  if (req.query.peaks === undefined) {
    return next();
  }

  const relativePath = req.params[0];
  if (!relativePath) {
    return next();
  }

  const originalPath = await findSoundFile(relativePath);
  if (!originalPath) {
    return next();
  }

  const cacheKey = `${relativePath.replace(/\//g, "_")}_peaks.json`;
  const cachePath = path.resolve(CACHE_DIR, cacheKey);

  try {
    const cached = await fs.readFile(cachePath, "utf-8");
    res.set("Content-Type", "application/json");
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    return res.send(cached);
  } catch {
    // Cache miss
  }

  try {
    await ensureCacheDir();
    const result = await computePeaks(originalPath);
    const json = JSON.stringify(result);

    // Write to cache (fire and forget)
    fs.writeFile(cachePath, json).catch(() => {});

    res.set("Content-Type", "application/json");
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    return res.send(json);
  } catch (err) {
    console.error("Sound peaks computation error:", err);
    return next();
  }
});
