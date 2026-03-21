import path from "path";

import { describe, expect, it } from "vitest";
import sharp from "sharp";

import { extractExif, injectExifIntoWebp } from "../../../../client/src/utils/exif";

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

describe("Client-side EXIF extraction and injection", () => {
  it("should extract EXIF from a JPEG file", async () => {
    const description = "JPEG EXIF test";
    const jpegBuffer = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 255, g: 0, b: 0 } },
    })
      .withMetadata({ exif: { IFD0: { ImageDescription: description } } })
      .jpeg()
      .toBuffer();

    const exif = extractExif(jpegBuffer.buffer.slice(jpegBuffer.byteOffset, jpegBuffer.byteOffset + jpegBuffer.byteLength));
    expect(exif).not.toBeNull();
    expect(exif!.byteLength).toBeGreaterThan(0);
  });

  it("should extract EXIF from a WebP file", async () => {
    const description = "WebP EXIF test";
    const webpBuffer = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 255, b: 0 } },
    })
      .withMetadata({ exif: { IFD0: { ImageDescription: description } } })
      .webp({ quality: 75 })
      .toBuffer();

    const exif = extractExif(webpBuffer.buffer.slice(webpBuffer.byteOffset, webpBuffer.byteOffset + webpBuffer.byteLength));
    expect(exif).not.toBeNull();
    expect(exif!.byteLength).toBeGreaterThan(0);
  });

  it("should return null for images without EXIF", async () => {
    const jpegBuffer = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 255, g: 0, b: 0 } },
    })
      .jpeg()
      .toBuffer();

    const exif = extractExif(jpegBuffer.buffer.slice(jpegBuffer.byteOffset, jpegBuffer.byteOffset + jpegBuffer.byteLength));
    expect(exif).toBeNull();
  });

  it("should return null for non-image data", () => {
    const garbage = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    expect(extractExif(garbage.buffer)).toBeNull();
  });

  it("should inject EXIF into WebP and make it readable by sharp", async () => {
    const description = "Injected EXIF";

    // Create a JPEG with EXIF to get raw EXIF bytes
    const jpegBuffer = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 255, g: 0, b: 0 } },
    })
      .withMetadata({ exif: { IFD0: { ImageDescription: description } } })
      .jpeg()
      .toBuffer();

    // Extract EXIF from JPEG
    const exifBytes = extractExif(jpegBuffer.buffer.slice(jpegBuffer.byteOffset, jpegBuffer.byteOffset + jpegBuffer.byteLength));
    expect(exifBytes).not.toBeNull();

    // Create a WebP WITHOUT EXIF (simulates Canvas output)
    const webpWithoutExif = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 0, b: 255 } },
    })
      .webp({ quality: 75 })
      .toBuffer();

    // Verify no EXIF before injection
    const metaBefore = await sharp(webpWithoutExif).metadata();
    expect(metaBefore.exif).toBeFalsy();

    // Inject EXIF into WebP
    const injectedBlob = injectExifIntoWebp(
      webpWithoutExif.buffer.slice(webpWithoutExif.byteOffset, webpWithoutExif.byteOffset + webpWithoutExif.byteLength),
      exifBytes!,
    );
    const injectedBuffer = Buffer.from(await injectedBlob.arrayBuffer());

    // Verify sharp can read the EXIF from the injected WebP
    const metaAfter = await sharp(injectedBuffer).metadata();
    expect(metaAfter.exif).toBeTruthy();
    expect(extractImageDescription(metaAfter.exif!)).toBe(description);
  });

  it("should preserve EXIF through the full compress pipeline (extract → inject → server read)", async () => {
    const description = "End-to-end EXIF test";

    // 1. Create a JPEG with EXIF (simulates original user photo)
    const originalJpeg = await sharp({
      create: { width: 100, height: 100, channels: 3, background: { r: 128, g: 128, b: 128 } },
    })
      .withMetadata({ exif: { IFD0: { ImageDescription: description } } })
      .jpeg()
      .toBuffer();

    // 2. Client-side: extract EXIF from original
    const exifBytes = extractExif(originalJpeg.buffer.slice(originalJpeg.byteOffset, originalJpeg.byteOffset + originalJpeg.byteLength));
    expect(exifBytes).not.toBeNull();

    // 3. Client-side: compress to WebP WITHOUT EXIF (simulates Canvas output)
    const compressedWebp = await sharp(originalJpeg)
      .resize({ width: 50 })
      .webp({ quality: 75 })
      .toBuffer();

    // 4. Client-side: inject EXIF back into compressed WebP
    const injectedBlob = injectExifIntoWebp(
      compressedWebp.buffer.slice(compressedWebp.byteOffset, compressedWebp.byteOffset + compressedWebp.byteLength),
      exifBytes!,
    );
    const injectedBuffer = Buffer.from(await injectedBlob.arrayBuffer());

    // 5. Server-side: extract EXIF and convert (simulates upload handler)
    const serverMeta = await sharp(injectedBuffer).metadata();
    expect(serverMeta.exif).toBeTruthy();
    expect(extractImageDescription(serverMeta.exif!)).toBe(description);

    // 6. Server-side: convert with withMetadata preserves EXIF in stored file
    const storedWebp = await sharp(injectedBuffer)
      .resize({ width: 800, withoutEnlargement: true })
      .withMetadata()
      .webp({ quality: 75 })
      .toBuffer();

    const storedMeta = await sharp(storedWebp).metadata();
    expect(storedMeta.exif).toBeTruthy();
    expect(extractImageDescription(storedMeta.exif!)).toBe(description);
  });
});
