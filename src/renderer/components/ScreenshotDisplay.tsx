import React from 'react';
import { CopyImageButton } from './buttons/CopyImageButton';

interface ScreenshotDisplayProps {
  screenShotResult: string; 
  showFloatingButton: boolean; 
  copyImageToClipboard: () => void;
  imageCopied: boolean;
}

const ScreenshotDisplay: React.FC<ScreenshotDisplayProps> = ({ 
  screenShotResult, 
  showFloatingButton, 
  copyImageToClipboard, 
  imageCopied 
}) => (
  <div className="relative group inline-flex justify-center">
    <img 
      src={`data:image/png;base64,${screenShotResult}`} 
      alt="screenshot" 
      className="mb-2 rounded-lg object-center border border-gray-100 dark:border-gray-800" 
    />
    {showFloatingButton && (
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
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