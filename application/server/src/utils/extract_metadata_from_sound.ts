interface SoundMetadata {
  artist?: string;
  title?: string;
}

/**
 * Parse RIFF INFO chunks from WAV/RIFF data to extract title and artist.
 * Handles Shift-JIS encoded metadata common in Japanese audio files.
 */
function parseRiffInfo(data: Buffer): SoundMetadata {
  const result: SoundMetadata = {};

  // Check RIFF header
  if (data.length < 12 || data.toString("ascii", 0, 4) !== "RIFF") {
    return result;
  }

  let offset = 12; // Skip RIFF header + size + WAVE
  while (offset + 8 <= data.length) {
    const chunkId = data.toString("ascii", offset, offset + 4);
    const chunkSize = data.readUInt32LE(offset + 4);
    offset += 8;

    if (chunkId === "LIST") {
      const listType = data.toString("ascii", offset, offset + 4);
      if (listType === "INFO") {
        let infoOffset = offset + 4;
        const infoEnd = offset + chunkSize;
        while (infoOffset + 8 <= infoEnd) {
          const tag = data.toString("ascii", infoOffset, infoOffset + 4);
          const tagSize = data.readUInt32LE(infoOffset + 4);
          infoOffset += 8;

          const rawBytes = data.subarray(infoOffset, infoOffset + tagSize);
          // Remove null terminator
          const trimmed = rawBytes[rawBytes.length - 1] === 0 ? rawBytes.subarray(0, -1) : rawBytes;

          let text: string;
          try {
            // Try Shift-JIS first for Japanese files
            text = new TextDecoder("shift-jis", { fatal: true }).decode(trimmed);
          } catch {
            text = trimmed.toString("utf-8");
          }

          if (tag === "INAM") result.title = text;
          if (tag === "IART") result.artist = text;

          infoOffset += tagSize + (tagSize % 2); // pad to even
        }
      }
      offset += chunkSize;
    } else {
      offset += chunkSize + (chunkSize % 2);
    }
  }

  return result;
}

export async function extractMetadataFromSound(data: Buffer): Promise<SoundMetadata> {
  // Try RIFF INFO parsing first (handles WAV files with Shift-JIS metadata)
  const riffResult = parseRiffInfo(data);
  if (riffResult.title || riffResult.artist) {
    return riffResult;
  }

  // Fallback to music-metadata for other formats
  try {
    const MusicMetadata = await import("music-metadata");
    const metadata = await MusicMetadata.parseBuffer(data);
    return {
      artist: metadata.common.artist,
      title: metadata.common.title,
    };
  } catch {
    return {
      artist: undefined,
      title: undefined,
    };
  }
}
