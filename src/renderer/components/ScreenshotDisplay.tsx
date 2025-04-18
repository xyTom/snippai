import React from "react";
import { CopyImageButton } from "./buttons/CopyImageButton";

interface ScreenshotDisplayProps {
  screenShotResult: string;
  showFloatingButton: boolean;
  copyImageToClipboard: () => void;
  imageCopied: boolean;
  isStickyMode?: boolean;
}

const ScreenshotDisplay: React.FC<ScreenshotDisplayProps> = ({
  screenShotResult,
  showFloatingButton,
  copyImageToClipboard,
  imageCopied,
  isStickyMode,
}) => (
  <div className="group flex justify-center items-center w-full h-full relative">
    <img
      src={`data:image/png;base64,${screenShotResult}`}
      alt="screenshot"
      className="rounded-lg object-contain max-w-full max-h-full w-auto h-auto border border-gray-100 dark:border-gray-800"
    />
    {showFloatingButton && (
      <div
        className={`absolute right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity ${
          isStickyMode ? "top-2" : "top-6"
        }`}
      >
        {" "}
        <CopyImageButton
          onClick={copyImageToClipboard}
          copied={imageCopied}
          variant="outline"
          className="h-8 w-8 p-0 mt-0"
        />
      </div>
    )}
  </div>
);

export default ScreenshotDisplay;
