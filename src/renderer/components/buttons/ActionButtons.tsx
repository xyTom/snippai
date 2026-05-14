import React from "react";
import PromptSelect from "../promptSelect";
import { models } from "../../lib/models";
import { ApiKeyButton } from "./ApiKeyButton";
import { RetryButton } from "./RetryButton";
import { CopyImageButton } from "./CopyImageButton";
import { PinButton } from "./PinButton";
import { TrashButton } from "./TrashButton";
import { PasteTextButton } from "./PasteTextButton";

interface ActionButtonsProps {
  isStickyMode: boolean;
  loading: boolean;
  model: string;
  result: string | null;
  onError: boolean;
  screenShotResult: string | null;
  handlePromptChange: (value: string) => void;
  recoginzeScreenshot: (value: string) => void;
  retryTextRecognition?: () => void;
  pasteTextFromClipboard?: () => void;
  copyImageToClipboard: () => void;
  imageCopied: boolean;
  pinToScreen: () => void;
  clearScreenshot: () => void;
  openApiKeyDialog: () => void;
  textMode?: boolean;
  responsivePromptSelect?: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  isStickyMode,
  loading,
  model,
  result,
  onError,
  screenShotResult,
  handlePromptChange,
  recoginzeScreenshot,
  retryTextRecognition,
  pasteTextFromClipboard,
  copyImageToClipboard,
  imageCopied,
  pinToScreen,
  clearScreenshot,
  openApiKeyDialog,
  textMode,
  responsivePromptSelect,
}) => {
  if (isStickyMode) return null;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 mb-2 justify-center min-h-[40px] items-center">
      <div className="flex items-center">
        <PromptSelect
          handlePromptChange={handlePromptChange}
          model={model}
          disabled={loading}
          responsiveMode={responsivePromptSelect ?? false}
        />
      </div>
      <div className="flex flex-nowrap gap-2 items-center">
        {(result || onError) && (
          <RetryButton
            onClick={() => {
              if (textMode) {
                retryTextRecognition?.();
              } else if (screenShotResult) {
                recoginzeScreenshot(screenShotResult);
              }
            }}
          />
        )}
        {pasteTextFromClipboard && <PasteTextButton onClick={pasteTextFromClipboard} />}
        {screenShotResult && <CopyImageButton onClick={copyImageToClipboard} copied={imageCopied} variant="secondary" />}
        {screenShotResult && <PinButton onClick={pinToScreen} />}
        {result && <TrashButton onClick={clearScreenshot} />}
        {models.find((m) => m.value === model)?.requireApiKey && (
          <ApiKeyButton onClick={openApiKeyDialog} />
        )}
      </div>
    </div>
  );
};

export default ActionButtons;
