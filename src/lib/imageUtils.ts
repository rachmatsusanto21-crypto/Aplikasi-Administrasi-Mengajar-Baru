/**
 * Utility to compress image files to optimized Base64 strings.
 * Prevents localStorage QuotaExceededError and ensures instant client-side persistence.
 */
export function compressImageFile(
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 400,
  quality: number = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file gambar"));
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) {
        reject(new Error("File kosong"));
        return;
      }
      const img = new Image();
      img.onerror = () => resolve(src); // Fallback to raw data URI if image load fails
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(src);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Keep PNG transparency if image/png, otherwise convert to JPEG/PNG for high compression
        const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
        try {
          const compressed = canvas.toDataURL(mimeType, quality);
          resolve(compressed);
        } catch {
          resolve(src);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}
