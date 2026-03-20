import { dump, insert, load, ImageIFD } from "piexifjs";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to convert canvas to blob"));
        }
      },
      type,
      quality,
    );
  });
}

function arrayBufferToBinaryString(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return binary;
}

export async function convertImage(file: File): Promise<Blob> {
  // 元画像からEXIF情報を読み取る
  const originalBuffer = await file.arrayBuffer();
  const originalBinary = arrayBufferToBinaryString(originalBuffer);

  let description: string | undefined;
  try {
    const exifData = load(originalBinary);
    const desc = exifData["0th"]?.[ImageIFD.ImageDescription];
    if (typeof desc === "string" && desc.length > 0) {
      description = desc;
    }
  } catch {
    // EXIFがない画像（PNGなど）は無視
  }

  // Canvas APIでJPEGに変換
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);

    const jpegBlob = await canvasToBlob(canvas, "image/jpeg", 0.8);

    if (description == null) {
      return jpegBlob;
    }

    // ImageDescriptionをEXIFとして書き戻す
    const jpegBuffer = await jpegBlob.arrayBuffer();
    const jpegBinary = arrayBufferToBinaryString(jpegBuffer);
    const descriptionBinary = arrayBufferToBinaryString(new TextEncoder().encode(description).buffer as ArrayBuffer);
    const exifStr = dump({ "0th": { [ImageIFD.ImageDescription]: descriptionBinary } });
    const outputWithExif = insert(exifStr, jpegBinary);
    const bytes = Uint8Array.from(outputWithExif.split("").map((c: string) => c.charCodeAt(0)));
    return new Blob([bytes], { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
  }
}
