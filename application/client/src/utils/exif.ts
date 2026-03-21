/**
 * Extract EXIF data from a JPEG file buffer.
 * Returns the raw EXIF payload (starting with "Exif\0\0" + TIFF header).
 */
function extractExifFromJpeg(buffer: ArrayBuffer): Uint8Array | null {
  const view = new DataView(buffer);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null;

  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset);
    if ((marker & 0xff00) !== 0xff00) break;
    if (marker === 0xffd9 || marker === 0xffda) break;

    const segmentLength = view.getUint16(offset + 2);

    if (marker === 0xffe1 && offset + 10 <= view.byteLength) {
      const sig = new Uint8Array(buffer, offset + 4, 6);
      // Check for "Exif\0\0"
      if (sig[0] === 0x45 && sig[1] === 0x78 && sig[2] === 0x69 && sig[3] === 0x66 && sig[4] === 0x00 && sig[5] === 0x00) {
        return new Uint8Array(buffer.slice(offset + 4, offset + 2 + segmentLength));
      }
    }

    offset += 2 + segmentLength;
  }
  return null;
}

/**
 * Extract EXIF data from a WebP file buffer.
 * Returns the raw EXIF payload from the EXIF RIFF chunk.
 */
function extractExifFromWebp(buffer: ArrayBuffer): Uint8Array | null {
  const view = new DataView(buffer);
  if (view.byteLength < 12) return null;

  const riff = String.fromCharCode(...new Uint8Array(buffer, 0, 4));
  const webp = String.fromCharCode(...new Uint8Array(buffer, 8, 4));
  if (riff !== "RIFF" || webp !== "WEBP") return null;

  let offset = 12;
  while (offset + 8 <= view.byteLength) {
    const fourCC = String.fromCharCode(...new Uint8Array(buffer, offset, 4));
    const chunkSize = view.getUint32(offset + 4, true);

    if (fourCC === "EXIF") {
      return new Uint8Array(buffer.slice(offset + 8, offset + 8 + chunkSize));
    }

    offset += 8 + chunkSize + (chunkSize % 2);
  }
  return null;
}

/**
 * Extract EXIF data from a file buffer (supports JPEG and WebP).
 */
export function extractExif(buffer: ArrayBuffer): Uint8Array | null {
  return extractExifFromJpeg(buffer) ?? extractExifFromWebp(buffer);
}

/**
 * Parse VP8/VP8L chunk to get image dimensions.
 */
function getWebpDimensions(buffer: ArrayBuffer): { width: number; height: number } | null {
  const view = new DataView(buffer);
  let offset = 12;

  while (offset + 8 <= buffer.byteLength) {
    const fourCC = String.fromCharCode(...new Uint8Array(buffer, offset, 4));
    const chunkSize = view.getUint32(offset + 4, true);

    if (fourCC === "VP8 " && offset + 18 <= buffer.byteLength) {
      const width = view.getUint16(offset + 14, true) & 0x3fff;
      const height = view.getUint16(offset + 16, true) & 0x3fff;
      return { width, height };
    }

    if (fourCC === "VP8L" && offset + 13 <= buffer.byteLength) {
      const bits = view.getUint32(offset + 9, true);
      const width = (bits & 0x3fff) + 1;
      const height = ((bits >> 14) & 0x3fff) + 1;
      return { width, height };
    }

    if (fourCC === "VP8X" && offset + 18 <= buffer.byteLength) {
      const w = (view.getUint8(offset + 12) | (view.getUint8(offset + 13) << 8) | (view.getUint8(offset + 14) << 16)) + 1;
      const h = (view.getUint8(offset + 15) | (view.getUint8(offset + 16) << 8) | (view.getUint8(offset + 17) << 16)) + 1;
      return { width: w, height: h };
    }

    offset += 8 + chunkSize + (chunkSize % 2);
  }
  return null;
}

/**
 * Check if a WebP buffer already has a VP8X chunk.
 */
function findVP8XOffset(buffer: ArrayBuffer): number {
  const view = new DataView(buffer);
  let offset = 12;

  while (offset + 8 <= buffer.byteLength) {
    const fourCC = String.fromCharCode(...new Uint8Array(buffer, offset, 4));
    if (fourCC === "VP8X") return offset;
    const chunkSize = view.getUint32(offset + 4, true);
    offset += 8 + chunkSize + (chunkSize % 2);
  }
  return -1;
}

/**
 * Inject EXIF data into a WebP buffer.
 * Handles both simple WebP (no VP8X) and extended WebP (with VP8X).
 * Returns a new Blob with the EXIF chunk added.
 */
export function injectExifIntoWebp(webpBuffer: ArrayBuffer, exifBytes: Uint8Array): Blob {
  const exifChunkDataSize = exifBytes.byteLength;
  const exifPaddedSize = exifChunkDataSize + (exifChunkDataSize % 2);
  const exifChunkTotalSize = 8 + exifPaddedSize;

  const vp8xOffset = findVP8XOffset(webpBuffer);

  if (vp8xOffset >= 0) {
    // VP8X already exists: set the EXIF flag (bit 3) and append EXIF chunk
    const result = new Uint8Array(webpBuffer.byteLength + exifChunkTotalSize);
    result.set(new Uint8Array(webpBuffer));
    const resultView = new DataView(result.buffer);

    // Set EXIF flag in VP8X flags (byte at vp8xOffset + 8, bit 3 = 0x08)
    result[vp8xOffset + 8] |= 0x08;

    // Update RIFF file size
    const currentRiffSize = resultView.getUint32(4, true);
    resultView.setUint32(4, currentRiffSize + exifChunkTotalSize, true);

    // Append EXIF chunk
    writeExifChunk(result, resultView, webpBuffer.byteLength, exifBytes, exifChunkDataSize);

    return new Blob([result], { type: "image/webp" });
  }

  // No VP8X: need to create one
  const dims = getWebpDimensions(webpBuffer);
  if (!dims) {
    // Can't determine dimensions, return without EXIF
    return new Blob([webpBuffer], { type: "image/webp" });
  }

  // VP8X chunk: FourCC(4) + Size(4) + Flags(4) + Width-1(3) + Height-1(3) = 18 bytes
  const vp8xChunkSize = 18;
  const totalSize = webpBuffer.byteLength + vp8xChunkSize + exifChunkTotalSize;
  const result = new Uint8Array(totalSize);
  const resultView = new DataView(result.buffer);

  // Copy RIFF header (12 bytes: "RIFF" + size + "WEBP")
  result.set(new Uint8Array(webpBuffer, 0, 12));

  // Write VP8X chunk at offset 12
  result[12] = 0x56; // V
  result[13] = 0x50; // P
  result[14] = 0x38; // 8
  result[15] = 0x58; // X
  resultView.setUint32(16, 10, true); // VP8X chunk data size is always 10
  resultView.setUint32(20, 0x08, true); // Flags: EXIF bit set (bit 3)
  // Width - 1 (24-bit LE)
  const w = dims.width - 1;
  result[24] = w & 0xff;
  result[25] = (w >> 8) & 0xff;
  result[26] = (w >> 16) & 0xff;
  // Height - 1 (24-bit LE)
  const h = dims.height - 1;
  result[27] = h & 0xff;
  result[28] = (h >> 8) & 0xff;
  result[29] = (h >> 16) & 0xff;

  // Copy remaining chunks after RIFF header
  result.set(new Uint8Array(webpBuffer, 12), 12 + vp8xChunkSize);

  // Append EXIF chunk at the end
  writeExifChunk(result, resultView, webpBuffer.byteLength + vp8xChunkSize, exifBytes, exifChunkDataSize);

  // Update RIFF file size
  resultView.setUint32(4, totalSize - 8, true);

  return new Blob([result], { type: "image/webp" });
}

function writeExifChunk(
  result: Uint8Array,
  view: DataView,
  offset: number,
  exifBytes: Uint8Array,
  dataSize: number,
): void {
  result[offset] = 0x45; // E
  result[offset + 1] = 0x58; // X
  result[offset + 2] = 0x49; // I
  result[offset + 3] = 0x46; // F
  view.setUint32(offset + 4, dataSize, true);
  result.set(exifBytes, offset + 8);
}
