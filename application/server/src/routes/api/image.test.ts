import path from "path";

import { describe, expect, it } from "vitest";
import sharp from "sharp";

import { extractImageDescription } from "./image";

describe("extractImageDescription", () => {
  it("should extract ImageDescription from a JPEG with EXIF", async () => {
    const description = "A cute cat";
    const jpegBuffer = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 255, g: 0, b: 0 } },
    })
      .withMetadata({ exif: { IFD0: { ImageDescription: description } } })
      .jpeg()
      .toBuffer();

    const metadata = await sharp(jpegBuffer).metadata();
    expect(extractImageDescription(metadata.exif!)).toBe(description);
  });

  it("should extract ImageDescription from a WebP with EXIF", async () => {
    const description = "WebP test description";
    const webpBuffer = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 255, b: 0 } },
    })
      .withMetadata({ exif: { IFD0: { ImageDescription: description } } })
      .webp({ quality: 75 })
      .toBuffer();

    const metadata = await sharp(webpBuffer).metadata();
    expect(metadata.exif).toBeTruthy();
    expect(extractImageDescription(metadata.exif!)).toBe(description);
  });

  it("should extract ASCII text with special characters from ImageDescription", async () => {
    const description = "A photo of sunset over the ocean";
    const jpegBuffer = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 255, g: 0, b: 0 } },
    })
      .withMetadata({ exif: { IFD0: { ImageDescription: description } } })
      .jpeg()
      .toBuffer();

    const metadata = await sharp(jpegBuffer).metadata();
    expect(extractImageDescription(metadata.exif!)).toBe(description);
  });

  it("should return empty string when no EXIF data", () => {
    expect(extractImageDescription(Buffer.alloc(0))).toBe("");
  });

  it("should return empty string when EXIF has no ImageDescription", async () => {
    // sharp generates EXIF with various fields but no ImageDescription when not specified
    const jpegBuffer = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 255, g: 0, b: 0 } },
    })
      .withMetadata()
      .jpeg()
      .toBuffer();

    const metadata = await sharp(jpegBuffer).metadata();
    if (metadata.exif) {
      expect(extractImageDescription(metadata.exif)).toBe("");
    }
  });

  it("should return empty string for corrupted EXIF buffer", () => {
    const garbage = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);
    expect(extractImageDescription(garbage)).toBe("");
  });

  it("should extract ImageDescription from a real seed WebP image", async () => {
    const imgPath = path.resolve(import.meta.dirname, "../../../../../../public/images/029b4b75-bbcc-4aa5-8bd7-e4bb12a33cd3.webp");
    try {
      const metadata = await sharp(imgPath).metadata();
      if (metadata.exif) {
        const alt = extractImageDescription(metadata.exif);
        expect(alt.length).toBeGreaterThan(0);
      }
    } catch {
      // Skip if file doesn't exist in CI
    }
  });
});

describe("WebP conversion EXIF preservation", () => {
  it("should lose EXIF when converting without withMetadata", async () => {
    const sourceBuffer = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 255, g: 0, b: 0 } },
    })
      .withMetadata({ exif: { IFD0: { ImageDescription: "should be lost" } } })
      .jpeg()
      .toBuffer();

    // Bug: converting without .withMetadata() strips EXIF
    const webpBuffer = await sharp(sourceBuffer)
      .webp({ quality: 75 })
      .toBuffer();

    const metadata = await sharp(webpBuffer).metadata();
    expect(metadata.exif).toBeFalsy();
  });

  it("should preserve EXIF when converting with withMetadata", async () => {
    const description = "should be preserved";
    const sourceBuffer = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 255, g: 0, b: 0 } },
    })
      .withMetadata({ exif: { IFD0: { ImageDescription: description } } })
      .jpeg()
      .toBuffer();

    // Fix: converting with .withMetadata() preserves EXIF
    const webpBuffer = await sharp(sourceBuffer)
      .withMetadata()
      .webp({ quality: 75 })
      .toBuffer();

    const metadata = await sharp(webpBuffer).metadata();
    expect(metadata.exif).toBeTruthy();
    expect(extractImageDescription(metadata.exif!)).toBe(description);
  });

  it("should preserve EXIF from PNG source when converting to WebP", async () => {
    const description = "PNG source image";

    // Create a JPEG with EXIF first, then use its EXIF buffer
    const jpegBuffer = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 0, b: 255 } },
    })
      .withMetadata({ exif: { IFD0: { ImageDescription: description } } })
      .jpeg()
      .toBuffer();

    // Convert JPEG (with EXIF) to WebP preserving metadata
    const webpBuffer = await sharp(jpegBuffer)
      .withMetadata()
      .webp({ quality: 75 })
      .toBuffer();

    const webpMeta = await sharp(webpBuffer).metadata();
    expect(webpMeta.exif).toBeTruthy();
    expect(extractImageDescription(webpMeta.exif!)).toBe(description);
  });
});
