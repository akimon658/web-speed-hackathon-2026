import { promises as fs } from "fs";
import path from "path";

import { Router } from "express";
import httpErrors from "http-errors";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

import { Image } from "@web-speed-hackathon-2026/server/src/models";
import { PUBLIC_PATH, UPLOAD_PATH } from "@web-speed-hackathon-2026/server/src/paths";

// 変換した画像の拡張子
const EXTENSION = "jpg";

/**
 * JPEG バッファから EXIF の ImageDescription を抽出する
 */
function extractImageDescription(buffer: Buffer): string {
  // JPEG SOI marker check
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return "";
  }

  let offset = 2;
  while (offset < buffer.length - 1) {
    if (buffer[offset] !== 0xff) break;
    const marker = buffer[offset + 1]!;

    if (marker === 0xe1) {
      // APP1 (EXIF)
      const segmentSize = buffer.readUInt16BE(offset + 2);
      const segmentData = buffer.subarray(offset + 4, offset + 4 + segmentSize - 2);

      // Check for "Exif\0\0" header
      if (
        segmentData[0] === 0x45 &&
        segmentData[1] === 0x78 &&
        segmentData[2] === 0x69 &&
        segmentData[3] === 0x66 &&
        segmentData[4] === 0x00 &&
        segmentData[5] === 0x00
      ) {
        const tiffData = segmentData.subarray(6);
        const isBigEndian = tiffData[0] === 0x4d && tiffData[1] === 0x4d;

        const readU16 = isBigEndian
          ? (buf: Buffer, off: number) => buf.readUInt16BE(off)
          : (buf: Buffer, off: number) => buf.readUInt16LE(off);
        const readU32 = isBigEndian
          ? (buf: Buffer, off: number) => buf.readUInt32BE(off)
          : (buf: Buffer, off: number) => buf.readUInt32LE(off);

        const ifdOffset = readU32(tiffData, 4);
        const entryCount = readU16(tiffData, ifdOffset);

        for (let i = 0; i < entryCount; i++) {
          const entryOffset = ifdOffset + 2 + i * 12;
          const tag = readU16(tiffData, entryOffset);

          if (tag === 0x010e) {
            // ImageDescription
            const count = readU32(tiffData, entryOffset + 4);
            const valueOffset = readU32(tiffData, entryOffset + 8);
            const descBytes = tiffData.subarray(valueOffset, valueOffset + count - 1); // -1 for null terminator
            return descBytes.toString("utf-8");
          }
        }
      }
      break;
    } else if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    } else {
      const segmentSize = buffer.readUInt16BE(offset + 2);
      offset += 2 + segmentSize;
      continue;
    }
  }

  return "";
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
    const filePath = path.resolve(base, `images/${imageId}.jpg`);
    try {
      const buffer = await fs.readFile(filePath);
      const alt = extractImageDescription(buffer);
      if (alt) {
        return res.status(200).type("application/json").send({ alt });
      }
    } catch {
      // continue
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

  // Convert any image format to JPEG using sharp, preserving EXIF metadata
  let jpegBuffer: Buffer;
  try {
    jpegBuffer = await sharp(req.body)
      .withMetadata()
      .jpeg({ quality: 80 })
      .toBuffer();
  } catch {
    throw new httpErrors.BadRequest("Unsupported image format");
  }

  const imageId = uuidv4();

  const filePath = path.resolve(UPLOAD_PATH, `./images/${imageId}.${EXTENSION}`);
  await fs.mkdir(path.resolve(UPLOAD_PATH, "images"), { recursive: true });
  await fs.writeFile(filePath, jpegBuffer);

  // EXIFからImageDescriptionを抽出
  const alt = extractImageDescription(jpegBuffer);

  return res.status(200).type("application/json").send({ id: imageId, alt });
});
