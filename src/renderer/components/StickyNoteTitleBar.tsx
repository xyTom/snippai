import React from "react";
import { Pin, X } from "lucide-react";
import DevTools from "./icons/DevTools";

// Check if we're in development mode
const isDevelopment = window.electronAPI?.isDevelopment;

interface StickyNoteTitleBarProps {
  isPinned: boolean;
  toggleStickyNotePin: () => void;
  isHorizontalMode?: boolean;
}

const StickyNoteTitleBar: React.FC<StickyNoteTitleBarProps> = ({
  isPinned,
  toggleStickyNotePin,
  isHorizontalMode = false,
}) => (
  <>
    <div className="titlebar flex items-center justify-between px-3 py-1.5 -webkit-app-region-drag border-b border-gray-700/50 bg-gray-900/50 backdrop-blur-sm fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-200">Snippai Note</span>
      </div>
      <div className="controls flex gap-1.5">
        <button
          className={`control-btn w-5 h-5 rounded-md ${
            isPinned
              ? "bg-purple-600 text-white"
              : "bg-gray-800/90 hover:bg-gray-700 text-gray-300 hover:text-white"
          } transition-colors flex items-center justify-center shadow-sm`}
          onClick={toggleStickyNotePin}
        >
          <Pin className={`h-3 w-3 ${isPinned ? "fill-current" : ""}`} />
        </button>
        <button
          className="control-btn w-5 h-5 rounded-md bg-gray-800/90 hover:bg-red-600 text-gray-300 hover:text-white transition-colors flex items-center justify-center shadow-sm"
          onClick={() => window.close()}
        >
          <X className="h-3 w-3" />
        </button>
        {isDevelopment && (
          <button
            className="control-btn w-5 h-5 rounded-md bg-gray-800/90 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors flex items-center justify-center shadow-sm"
            onClick={() => window.electronAPI?.openDevTools()}
          >
            <DevTools className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
    <div className={`titlebar-placeholder h-[32px] ${!isHorizontalMode ? 'shrink-0' : ''}`}></div>
  </>
);

export default StickyNoteTitleBar;
