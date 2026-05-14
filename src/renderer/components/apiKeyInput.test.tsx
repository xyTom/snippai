import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ApiKeyInput from "./apiKeyInput";

describe("ApiKeyInput", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders when the selected model is a custom provider model", () => {
    expect(() => {
      act(() => {
        root.render(
          <ApiKeyInput
            apikey=""
            model="provider:openai:gpt-4o"
            onKeySave={vi.fn()}
            onOpenChange={vi.fn()}
            open={false}
          />
        );
      });
    }).not.toThrow();
  });
});
