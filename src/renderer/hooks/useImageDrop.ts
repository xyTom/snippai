import { useCallback, useEffect, useRef, useState } from "react";
import { convertFileToPngBase64 } from "@/utils/image";

interface UseImageDropOptions {
  onImageDrop: (base64: string, file: File) => void;
  onInvalidFile: () => void;
  onDropError: () => void;
  disabled?: boolean;
}

export const useImageDrop = ({
  onImageDrop,
  onInvalidFile,
  onDropError,
  disabled = false,
}: UseImageDropOptions) => {
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const dragCounter = useRef(0);

  const resetDragState = useCallback(() => {
    dragCounter.current = 0;
    setIsDraggingFile(false);
  }, []);

  const handleDroppedImage = useCallback(
    async (file: File) => {
      try {
        const base64 = await convertFileToPngBase64(file);
        onImageDrop(base64, file);
      } catch (error) {
        console.error("Failed to process dropped image:", error);
        onDropError();
      }
    },
    [onDropError, onImageDrop]
  );

  const handleDropEvent = useCallback(
    (event: DragEvent) => {
      if (disabled) return;
      event.preventDefault();
      event.stopPropagation();
      resetDragState();

      const files = event.dataTransfer?.files;
      if (!files || files.length === 0) {
        return;
      }

      const imageFile = Array.from(files).find((file) =>
        file.type.startsWith("image/")
      );

      if (!imageFile) {
        onInvalidFile();
        return;
      }

      handleDroppedImage(imageFile);
    },
    [disabled, handleDroppedImage, onInvalidFile, resetDragState]
  );

  const handleDragEnter = useCallback(
    (event: DragEvent) => {
      if (disabled) return;
      if (!event.dataTransfer) return;
      const hasFiles = Array.from(event.dataTransfer.types).includes("Files");
      if (!hasFiles) return;
      event.preventDefault();
      event.stopPropagation();
      dragCounter.current += 1;
      setIsDraggingFile(true);
    },
    [disabled]
  );

  const handleDragOver = useCallback(
    (event: DragEvent) => {
      if (disabled) return;
      if (!event.dataTransfer) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "copy";
      const hasFiles = Array.from(event.dataTransfer.types).includes("Files");
      if (hasFiles) {
        setIsDraggingFile(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback(
    (event: DragEvent) => {
      if (disabled) return;
      if (!event.dataTransfer) return;
      const hasFiles = Array.from(event.dataTransfer.types).includes("Files");
      if (!hasFiles) return;
      event.preventDefault();
      event.stopPropagation();
      dragCounter.current = Math.max(0, dragCounter.current - 1);
      if (dragCounter.current === 0) {
        setIsDraggingFile(false);
      }
    },
    [disabled]
  );

  useEffect(() => {
    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDropEvent);
    window.addEventListener("dragend", resetDragState);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDropEvent);
      window.removeEventListener("dragend", resetDragState);
    };
  }, [
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDropEvent,
    resetDragState,
  ]);

  useEffect(() => {
    if (disabled) {
      resetDragState();
    }
  }, [disabled, resetDragState]);

  return { isDraggingFile };
};
