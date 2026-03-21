import { promises as fs } from "fs";
import path from "path";

import exifReader from "exif-reader";
import { Router } from "express";
import httpErrors from "http-errors";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

import { Image } from "@web-speed-hackathon-2026/server/src/models";
import { PUBLIC_PATH, UPLOAD_PATH } from "@web-speed-hackathon-2026/server/src/paths";

// 変換した画像の拡張子
const EXTENSION = "webp";

/**
 * sharp の metadata().exif が返す raw EXIF バッファから ImageDescription を抽出する
 */
export function extractImageDescription(exifBuffer: Buffer): string {
  try {
    const parsed = exifReader(exifBuffer);
    const desc = parsed.Image?.ImageDescription;
    if (typeof desc === "string") {
      return desc;
    }
    if (Buffer.isBuffer(desc)) {
      return desc.toString("utf-8");
    }
    return "";
  } catch {
    return "";
  }
}

export const imageRouter = Router();

imageRouter.get("/images/:imageId/alt", async (req, res) => {
  const { imageId } = req.params;

  res.header("Cache-Control", "public, max-age=31536000, immutable");

  // まずDBからaltを取得
  const image = await Image.findByPk(imageId, { attributes: ["id", "alt"] });
  if (image && image.alt) {
    return res.status(200).type("application/json").send({ alt: image.alt });
  }

  // DBにaltがない場合、画像ファイルのEXIFから取得
  for (const base of [UPLOAD_PATH, PUBLIC_PATH]) {
    for (const ext of ["webp", "jpg"]) {
      const filePath = path.resolve(base, `images/${imageId}.${ext}`);
      try {
        const metadata = await sharp(filePath).metadata();
        if (metadata.exif) {
          const alt = extractImageDescription(metadata.exif);
          if (alt) {
            return res.status(200).type("application/json").send({ alt });
          }
        }
      } catch {
        // continue
      }
    }
  }

  if (!image) {
    throw new httpErrors.NotFound();
  }

  return res.status(200).type("application/json").send({ alt: "" });
});

imageRouter.post("/images", async (req, res) => {
  if (req.session.userId === undefined) {
    throw new httpErrors.Unauthorized();
  }
  if (Buffer.isBuffer(req.body) === false) {
    throw new httpErrors.BadRequest();
  }

  // EXIFからImageDescriptionを抽出（変換前のオリジナルから取得）
  let alt = "";
  try {
    const metadata = await sharp(req.body).metadata();
    if (metadata.exif) {
      alt = extractImageDescription(metadata.exif);
    }
  } catch {
    // EXIF抽出失敗は無視
  }

  // Convert any image format directly to WebP
  let webpBuffer: Buffer;
  try {
    webpBuffer = await sharp(req.body)
      .withMetadata()
      .webp({ quality: 75 })
      .toBuffer();
  } catch {
    throw new httpErrors.BadRequest("Unsupported image format");
  }

  const imageId = uuidv4();

  const filePath = path.resolve(UPLOAD_PATH, `./images/${imageId}.${EXTENSION}`);
  await fs.mkdir(path.resolve(UPLOAD_PATH, "images"), { recursive: true });
  await fs.writeFile(filePath, webpBuffer);

  return res.status(200).type("application/json").send({ id: imageId, alt });
});
