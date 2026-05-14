import React from "react";
import PromptSelect from "../promptSelect";
import { models } from "../../lib/models";
import { ApiKeyButton } from "./ApiKeyButton";
import { RetryButton } from "./RetryButton";
import { CopyImageButton } from "./CopyImageButton";
import { PinButton } from "./PinButton";
import { TrashButton } from "./TrashButton";
import { PasteTextButton } from "./PasteTextButton";
import { PromptEditButton } from "./PromptEditButton";
import { CustomPrompt } from "../CustomPromptDialog";

interface ActionButtonsProps {
  isStickyMode: boolean;
  loading: boolean;
  model: string;
  result: string | null;
  onError: boolean;
  screenShotResult: string | null;
  handlePromptChange: (value: string) => void;
  customPrompts?: CustomPrompt[];
  promptVersion?: number;
  recoginzeScreenshot: (value: string) => void;
  retryTextRecognition?: () => void;
  pasteTextFromClipboard?: () => void;
  copyImageToClipboard: () => void;
  imageCopied: boolean;
  pinToScreen: () => void;
  clearScreenshot: () => void;
  openApiKeyDialog: () => void;
  openPromptDialog?: () => void;
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
  customPrompts,
  promptVersion,
  recoginzeScreenshot,
  retryTextRecognition,
  pasteTextFromClipboard,
  copyImageToClipboard,
  imageCopied,
  pinToScreen,
  clearScreenshot,
  openApiKeyDialog,
  openPromptDialog,
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
          customPrompts={customPrompts}
          version={promptVersion}
        />
      </div>
      <div className="flex flex-nowrap gap-2 items-center">
        {openPromptDialog && <PromptEditButton onClick={openPromptDialog} />}
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
