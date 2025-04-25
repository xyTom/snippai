import React from "react";
import PromptSelect from "../promptSelect";
import { models } from "../../lib/models";
import { ApiKeyButton } from "./ApiKeyButton";
import { RetryButton } from "./RetryButton";
import { CopyImageButton } from "./CopyImageButton";
import { PinButton } from "./PinButton";
import { TrashButton } from "./TrashButton";

interface ActionButtonsProps {
  isStickyMode: boolean;
  loading: boolean;
  model: string;
  result: any;
  onError: boolean;
  screenShotResult: string;
  handlePromptChange: (value: string) => void;
  recoginzeScreenshot: (value: string) => void;
  copyImageToClipboard: () => void;
  imageCopied: boolean;
  pinToScreen: () => void;
  clearScreenshot: () => void;
  openApiKeyDialog: () => void;
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
  copyImageToClipboard,
  imageCopied,
  pinToScreen,
  clearScreenshot,
  openApiKeyDialog,
  responsivePromptSelect,
}) => {
  if (isStickyMode) return null;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 mb-2 justify-center items-center overflow-x-hidden">
      <div>
        <PromptSelect
          handlePromptChange={handlePromptChange}
          model={model}
          disabled={loading}
          responsiveMode={responsivePromptSelect ?? false}
        />
      </div>
      <div className="flex flex-nowrap gap-2">
        {result && (
          <RetryButton onClick={() => recoginzeScreenshot(screenShotResult)} />
        )}
        {onError && (
          <RetryButton onClick={() => recoginzeScreenshot(screenShotResult)} />
        )}
        {screenShotResult && (
          <CopyImageButton
            onClick={copyImageToClipboard}
            copied={imageCopied}
            variant="secondary"
          />
        )}
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
