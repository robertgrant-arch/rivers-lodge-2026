/**
 * Shrink a photo in the browser before it goes into an email: emails should be
 * light, and most mail apps show images at ≤ 600px wide anyway.
 */
const MAX_EDGE = 1200;
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const PASSTHROUGH_BYTES = 400 * 1024;

export type PreparedEmailImage = { base64: string; contentType: "image/jpeg" | "image/png" | "image/gif"; fileName: string };

function readBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(new Error("Couldn't read the image."));
    r.readAsDataURL(blob);
  });
}

export async function prepareEmailImage(file: File): Promise<PreparedEmailImage> {
  const type = file.type;
  if (!["image/jpeg", "image/png", "image/gif"].includes(type)) throw new Error("Please choose a JPG, PNG or GIF image.");
  if (file.size > MAX_SOURCE_BYTES) throw new Error("That image is larger than 25 MB.");
  // GIFs (may be animated) and small files go up untouched.
  if (type === "image/gif" || file.size <= PASSTHROUGH_BYTES) {
    if (file.size > 2.5 * 1024 * 1024) throw new Error("GIFs must be 2.5 MB or smaller.");
    return { base64: await readBase64(file), contentType: type as PreparedEmailImage["contentType"], fileName: file.name };
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("That file couldn't be opened as an image."));
      i.src = url;
    });
    const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser couldn't resize the image.");
    const asPng = type === "image/png";
    if (!asPng) { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, asPng ? "image/png" : "image/jpeg", 0.85));
    if (!blob) throw new Error("Your browser couldn't resize the image.");
    return { base64: await readBase64(blob), contentType: asPng ? "image/png" : "image/jpeg", fileName: file.name };
  } finally {
    URL.revokeObjectURL(url);
  }
}
