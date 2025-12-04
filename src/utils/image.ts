export const convertFileToPngBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Unable to create canvas context"));
          return;
        }
        ctx.drawImage(image, 0, 0);
        const pngDataUrl = canvas.toDataURL("image/png");
        const base64 = pngDataUrl.split(",")[1];
        if (!base64) {
          reject(new Error("Invalid image data"));
          return;
        }
        resolve(base64);
      };
      image.onerror = () => reject(new Error("Unable to load image"));
      image.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
};
