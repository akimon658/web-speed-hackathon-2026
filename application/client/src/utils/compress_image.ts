import { extractExif, injectExifIntoWebp } from "./exif";

const MAX_WIDTH = 800;
const QUALITY = 0.75;

export async function compressImage(file: File): Promise<Blob> {
  // 圧縮前に元ファイルからEXIFを抽出
  const originalBuffer = await file.arrayBuffer();
  const exifBytes = extractExif(originalBuffer);

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // TIFF等ブラウザが未対応の形式はそのままサーバーに送る
    return file;
  }

  let width = bitmap.width;
  let height = bitmap.height;
  if (width > MAX_WIDTH) {
    height = Math.round((height * MAX_WIDTH) / width);
    width = MAX_WIDTH;
  }

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let blob = await canvas.convertToBlob({ type: "image/webp", quality: QUALITY });

  // EXIFが存在する場合、圧縮後のWebPに再注入
  if (exifBytes) {
    const webpBuffer = await blob.arrayBuffer();
    blob = injectExifIntoWebp(webpBuffer, exifBytes);
  }

  return blob;
}
