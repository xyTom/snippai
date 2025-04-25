import "./App.css";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import aiModels from "./models";
//disable the eslint warning for the import of the logo
// eslint-disable-next-line
import logo from "./assets/logo.png";
import { Badge } from "./components/ui/badge";
import ModelSelect from "./components/modelSelect";
import ApiKeyInput from "./components/apiKeyInput";
import LanguageInput from "./components/languageInput";
import { LanguageButton } from "./components/buttons/languageButton";
import { useToast } from "./components/ui/use-toast";
import { Toaster } from "./components/ui/toaster";
import SettingsPage from "./components/SettingsPage";

// 导入提取的组件
import StickyNoteTitleBar from "./components/StickyNoteTitleBar";
import ScreenshotDisplay from "./components/ScreenshotDisplay";
import ActionButtons from "./components/buttons/ActionButtons";
import ResultDisplay from "./components/ResultDisplay";
import ImageIcon from "./components/icons/ImageIcon";

// 导入按钮组件（仅用于类型导出）
import { ApiKeyButton } from "./components/buttons/ApiKeyButton";
import { RetryButton } from "./components/buttons/RetryButton";
import { CopyImageButton } from "./components/buttons/CopyImageButton";
import { PinButton } from "./components/buttons/PinButton";
import { TrashButton } from "./components/buttons/TrashButton";
import { SettingsButton } from "./components/buttons/SettingsButton";

import { promptOptions, models } from "./lib/models";

declare global {
  interface Window {
    electronAPI: any;
  }
}

function App() {
  // 状态管理
  const [screenShotResult, setscreenShotResult] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [showFloatingButton, setShowFloatingButton] = useState(true);

  // 便签模式状态
  const [isStickyMode, setIsStickyMode] = useState(false);
  const [isPinned, setIsPinned] = useState(true);

  // 错误状态
  const [onError, setOnError] = useState(false);

  // 模型状态
  const [ready, setReady] = useState<boolean | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [progressItems, setProgressItems] = useState<any[]>([]);

  // Toast通知
  const { toast } = useToast();

  // AI模型选择
  const [model, setModel] = useState("gemini");
  const [language, setLanguage] = useState("english");
  const [openLanguageDialog, setOpenLanguageDialog] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [prompt, setPrompt] = useState("Auto");

  // API密钥管理
  let keyMap = useMemo(() => {
    const map = new Map();
    models.forEach((model) => {
      if (model.requireApiKey) {
        map.set(model.value, "");
      }
    });
    return map;
  }, []);

  const [apiKey, setApiKey] = useState("");

  // 设置页面状态
  const [openSettings, setOpenSettings] = useState(false);

  // 布局设置
  const [horizontalLayout, setHorizontalLayout] = useState(false);

  // 工作线程引用
  const worker = useRef<Worker | null>(null);

  // 检查是否为便签模式
  useEffect(() => {
    const checkIsStickyMode = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(
        window.location.hash.replace("#", "")
      );

      const isSticky =
        urlParams.get("isSticky") === "true" ||
        hashParams.get("isSticky") === "true";
      setIsStickyMode(isSticky);

      if (isSticky) {
        setShowFloatingButton(false);
      }
    };

    checkIsStickyMode();

    if (isStickyMode) {
      const handleStickyNoteData = (data: {
        screenshot: string;
        result: string;
      }) => {
        if (data.screenshot) {
          setscreenShotResult(data.screenshot);
        }

        if (data.result) {
          setResult(data.result);
        }
      };

      window.electronAPI?.onStickyNoteData(handleStickyNoteData);

      return () => {
        window.electronAPI?.removeListener(
          "sticky-note-data",
          handleStickyNoteData
        );
      };
    }
  }, [isStickyMode]);

  // 从localStorage加载模型选择
  useEffect(() => {
    const savedModel = localStorage.getItem("model");
    if (savedModel) {
      setModel(savedModel);
    }

    const savedLanguage = localStorage.getItem("language");
    if (savedLanguage) {
      setLanguage(savedLanguage);
    }

    // 从localStorage加载API密钥
    const keys = localStorage.getItem("apiKeyMap");
    if (keys) {
      try {
        const keyMapObj = JSON.parse(keys);
        for (const [key, value] of Object.entries(keyMapObj)) {
          keyMap.set(key, value);
        }

        if (keyMap.has(model)) {
          setApiKey(keyMap.get(model));
        }
      } catch (error) {
        console.error("Failed to parse API keys from localStorage:", error);
      }
    }
  }, [model, keyMap]);

  // 处理语言对话框打开/关闭
  const handleLanguageOpenChange = useCallback((value: boolean) => {
    setOpenLanguageDialog(value);
  }, []);

  // 处理API密钥对话框打开/关闭
  const handleOpenChange = useCallback((value: boolean) => {
    setOpenDialog(value);
  }, []);

  // 处理文本变化
  const handleTextChange = useCallback((text: string) => {
    setResult(text);
  }, []);

  // 处理模型变化
  const handleModelChange = useCallback(
    (value: string) => {
      if (value === model || !value) {
        return;
      }
      setModel(value);

      if (keyMap.has(value)) {
        setApiKey(keyMap.get(value));
        isApiKeyEmpty();
      }
    },
    [model, keyMap]
  );

  // 处理语言变化
  const handleLanguageChange = useCallback(
    (value: string) => {
      if (value === language || !value) {
        return;
      }
      setLanguage(value);
      localStorage.setItem("language", value);
    },
    [language]
  );

  // 处理API密钥变化
  const handleApiKeyChange = useCallback(
    (value: string) => {
      keyMap.set(model, value);
      setApiKey(value);
      localStorage.setItem(
        "apiKeyMap",
        JSON.stringify(Object.fromEntries(keyMap))
      );
      setOpenDialog(false);
    },
    [model, keyMap]
  );

  // 检查API密钥是否为空
  const isApiKeyEmpty = useCallback(() => {
    if (apiKey === "") {
      setOpenDialog(true);
    }
  }, [apiKey]);

  // 识别截图
  const recoginzeScreenshot = useCallback(
    (value: string) => {
      setResult(null);
      setOnError(false);
      setLoading(true);

      aiModels
        .create(model)
        .then((modelInstance: any) => {
          const selectedPrompt = promptOptions[
            model as keyof typeof promptOptions
          ].find((p) => p.value === prompt);
          let fullPrompt = selectedPrompt ? selectedPrompt.prompt : "";

          // 添加语言指令
          fullPrompt += ` Please answer in ${language}.`;

          if (models.find((m) => m.value === model)?.requireApiKey) {
            return modelInstance.run(value, fullPrompt, apiKey);
          }
          return modelInstance.run(value, fullPrompt);
        })
        .then((res: string) => {
          setLoading(false);
          setResult(res);
        })
        .catch((error: any) => {
          console.error("模型错误:", error);
          setLoading(false);
          setOnError(true);
          toast({
            title: "Error!",
            description: `Please try again later. Error message: ${error.message}`,
          });
        });
    },
    [model, prompt, language, apiKey, toast]
  );

  // 当提示或截图或语言变化时，重新识别截图
  useEffect(() => {
    // 在钉图模式下不重新请求API识别结果
    if (screenShotResult !== null && !isStickyMode) {
      recoginzeScreenshot(screenShotResult);
    }
  }, [prompt, screenShotResult, language, recoginzeScreenshot, isStickyMode]);

  // 设置工作线程
  useEffect(() => {
    const onMessageReceived = (e: MessageEvent) => {
      switch (e.data.status) {
        case "initiate":
          setReady(false);
          setProgressItems((prev) => [...prev, e.data]);
          break;
        case "progress":
          setProgressItems((prev) =>
            prev.map((item) => {
              if (item.file === e.data.file) {
                return { ...item, progress: e.data.progress };
              }
              return item;
            })
          );
          break;
        case "done":
          setProgressItems((prev) =>
            prev.filter((item) => item.file !== e.data.file)
          );
          break;
        case "ready":
          setReady(true);
          break;
        case "update":
          console.log(e.data.output);
          break;
        case "complete":
          setDisabled(false);
          break;
      }
    };

    // 初始化工作线程
    if (!worker.current && typeof Worker !== "undefined") {
      try {
        // 使用动态导入或在tsconfig中配置正确的module选项
        // 或者提供静态路径
        worker.current = new Worker("./worker.js", {
          type: "module",
        });
        worker.current.addEventListener("message", onMessageReceived);
      } catch (error) {
        console.error("Failed to initialize worker:", error);
      }
    }

    // 注册截图结果处理程序
    const handleScreenShotRes = (value: string) => {
      setscreenShotResult(value);
    };

    // Register screenshot result handler
    window.electronAPI?.onScreenShotRes(handleScreenShotRes);

    return () => {
      window.electronAPI?.removeAllListeners("screenshot-result");
      worker.current?.removeEventListener("message", onMessageReceived);
    };
  }, []);

  // 存储当前配置的快捷键
  const [shortcut, setShortcut] = useState("");

  // 加载并格式化快捷键显示
  useEffect(() => {
    const loadShortcut = async () => {
      try {
        const settings = await window.electronAPI?.getAppSettings();
        if (settings?.shortcuts?.screenshot) {
          // 格式化快捷键显示
          let formattedShortcut = settings.shortcuts.screenshot
            .replace(
              "CommandOrControl",
              window.navigator.platform === "MacIntel" ? "Command" : "Ctrl"
            )
            .split("+")
            .join(" + ");
          setShortcut(formattedShortcut);
        } else {
          // 如果没有设置，使用默认值
          setShortcut(
            window.navigator.platform === "MacIntel"
              ? "Command + Shift + A"
              : "Ctrl + Shift + A"
          );
        }

        // 加载布局设置
        if (settings?.general?.horizontalLayout !== undefined) {
          setHorizontalLayout(settings.general.horizontalLayout);
        }
      } catch (error) {
        console.error("Failed to load app settings:", error);
        // 加载失败时使用默认值
        setShortcut(
          window.navigator.platform === "MacIntel"
            ? "Command + Shift + A"
            : "Ctrl + Shift + A"
        );
      }
    };

    loadShortcut();
  }, []);

  // 检测图片尺寸并决定是否显示悬浮按钮
  const checkImageSize = useCallback((img: HTMLImageElement) => {
    const MIN_SIZE = 32;

    setImageSize({
      width: img.width,
      height: img.height,
    });

    setShowFloatingButton(img.width > MIN_SIZE && img.height > MIN_SIZE);
  }, []);

  // 复制截图到剪贴板
  const copyImageToClipboard = useCallback(async () => {
    if (screenShotResult) {
      try {
        const img = new Image();
        img.src = `data:image/png;base64,${screenShotResult}`;

        await new Promise<void>((resolve) => {
          img.onload = () => {
            checkImageSize(img);
            resolve();
          };
        });

        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Unable to create canvas context");

        ctx.drawImage(img, 0, 0);

        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => resolve(blob!), "image/png");
        });

        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": blob,
          }),
        ]);

        setImageCopied(true);
        toast({
          title: "Copied",
          description: "Screenshot copied to clipboard",
        });

        setTimeout(() => {
          setImageCopied(false);
        }, 1500);
      } catch (error) {
        console.error("Failed to copy image:", error);
        toast({
          title: "Copy Failed",
          description: "Unable to copy screenshot to clipboard",
          variant: "destructive",
        });
      }
    }
  }, [screenShotResult, checkImageSize, toast]);

  // 当screenShotResult变化时检查图片尺寸
  useEffect(() => {
    if (screenShotResult) {
      const img = new Image();
      img.src = `data:image/png;base64,${screenShotResult}`;
      img.onload = () => checkImageSize(img);
    }
  }, [screenShotResult, checkImageSize]);

  // 在屏幕上打开一个固定窗口
  const pinToScreen = useCallback(() => {
    if (screenShotResult && window.electronAPI?.pinToScreen) {
      try {
        window.electronAPI?.pinToScreen({
          screenshot: screenShotResult,
          result: result,
        });

        toast({
          title: "Pinned",
          description:
            "Screenshot has been pinned to the screen as a sticky note",
        });
      } catch (error) {
        console.error("Failed to pin to screen:", error);
        toast({
          title: "Pin Failed",
          description: "Unable to pin screenshot to screen",
          variant: "destructive",
        });
      }
    }
  }, [screenShotResult, result, toast]);

  // 切换便签的固定状态
  const toggleStickyNotePin = useCallback(() => {
    if (!window.electronAPI?.toggleStickyNotePin) return;
    const newPinState = !isPinned;
    window.electronAPI?.toggleStickyNotePin({ isPinned: newPinState });
    setIsPinned(newPinState);
  }, [isPinned]);

  // 处理便签大小调整的开始
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (!window.electronAPI?.resizeStickyNote) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = document.documentElement.clientWidth;
    const startHeight = document.documentElement.clientHeight;

    const handleMouseMove = (e: MouseEvent) => {
      const width = startWidth + e.clientX - startX;
      const height = startHeight + e.clientY - startY;
      window.electronAPI?.resizeStickyNote({ width, height });
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, []);

  // 清除截图和结果
  const clearScreenshot = useCallback(() => {
    setscreenShotResult(null);
    setResult(null);
    setOnError(false);
  }, []);

  // 打开API密钥对话框
  const openApiKeyDialog = useCallback(() => {
    setOpenDialog(true);
  }, []);

  // 处理提示变化
  const handlePromptChange = useCallback((value: string) => {
    setPrompt(value);
  }, []);

  // 渲染组件
  return (
    <div
      className={`App dark select-none ${isStickyMode ? "sticky-mode" : ""}`}
    >
      <main
        className={`App-header ${
          horizontalLayout
            ? "h-screen overflow-hidden"
            : "min-h-screen overflow-y-auto"
        } flex flex-col items-center relative`}
      >
        {" "}
        {/* 便签模式标题栏 */}
        {isStickyMode && (
          <StickyNoteTitleBar
            isPinned={isPinned}
            toggleStickyNotePin={toggleStickyNotePin}
          />
        )}
        {/* 普通模式头部UI */}
        {!isStickyMode && (
          <div
            className={`z-50 flex h-8 px-4 md:px-6 w-full shrink-0 absolute right-0 transition-all duration-300 ${
              screenShotResult ? "top-[0.5rem]" : "top-[0.5rem]"
            }`}
          >
            <div className="hidden sm:flex">
              <span className="sr-only">Snippai</span>
            </div>
            <div className="ml-auto space-x-4 flex text-white select-none">
              <SettingsButton onClick={() => setOpenSettings(true)} />
              <LanguageButton
                onClick={() => setOpenLanguageDialog(true)}
                language={language}
              />
              <ModelSelect handleModelChange={handleModelChange} />
            </div>
          </div>
        )}
        {/* 显示logo或引导文本 */}
        <div className="flex-1 flex flex-col items-center justify-center w-full mx-auto pt-6 h-full">
          {!isStickyMode && !screenShotResult && (
            <>
              <img src={logo} className="App-logo select-none" alt="logo" />
              <p className="mb-2 select-none">
                Press <code>{shortcut}</code> to make a screenshot.
              </p>
            </>
          )}
          {!screenShotResult && (
            <div
              className={`w-full z-30 ${
                horizontalLayout ? "sticky top-0 bg-black pt-2" : "py-4"
              }`}
              style={{ zIndex: 30 }}
            >
              <ActionButtons
                isStickyMode={isStickyMode}
                loading={loading}
                model={model}
                result={result}
                onError={onError}
                screenShotResult={screenShotResult}
                handlePromptChange={handlePromptChange}
                recoginzeScreenshot={recoginzeScreenshot}
                copyImageToClipboard={copyImageToClipboard}
                imageCopied={imageCopied}
                pinToScreen={pinToScreen}
                clearScreenshot={clearScreenshot}
                openApiKeyDialog={openApiKeyDialog}
              />
            </div>
          )}
          {/* ActionButtons */}
          {horizontalLayout && screenShotResult ? (
            <div
              className="w-full z-30 sticky bg-black  top-[4.0rem] overflow-visible"
              style={{ zIndex: 30 }}
            >
              <ActionButtons
                isStickyMode={isStickyMode}
                loading={loading}
                model={model}
                result={result}
                onError={onError}
                screenShotResult={screenShotResult}
                handlePromptChange={handlePromptChange}
                recoginzeScreenshot={recoginzeScreenshot}
                copyImageToClipboard={copyImageToClipboard}
                imageCopied={imageCopied}
                pinToScreen={pinToScreen}
                clearScreenshot={clearScreenshot}
                openApiKeyDialog={openApiKeyDialog}
                responsivePromptSelect={true}
              />
            </div>
          ) : null}

          {/* {screenShotResult && (
  <div className="h-[5px]"></div>
)} */}
          {/* 截图和结果并排显示 */}
          {screenShotResult && (
            <div className="mt-4 w-full flex-1 flex flex-col">
              {horizontalLayout ? (
                <div
                  className={`flex gap-4 w-full flex-1 mt-4  px-4 pb-4${
                    isStickyMode
                      ? "min-h-[400px] max-h-[calc(100vh-3rem)] overflow-y-auto"
                      : "max-h-[calc(100vh-4.5rem)] overflow-hidden"
                  }`}
                >
                  {/* 左侧截图区域 */}
                  <div
                    className={`flex-1 min-w-0 flex pb-10 items-center justify-center ${
                      isStickyMode ? "" : "max-h-[calc(100vh-4.5rem)] h-full"
                    }`}
                  >
                    <div className="w-full h-full">
                      <ScreenshotDisplay
                        screenShotResult={screenShotResult}
                        showFloatingButton={showFloatingButton}
                        copyImageToClipboard={copyImageToClipboard}
                        imageCopied={imageCopied}
                        isStickyMode={isStickyMode}
                      />
                    </div>
                  </div>

                  {/* 右侧结果区域 */}
                  <div
                    className={`flex-1 flex flex-col min-h-0  ${
                      isStickyMode
                        ? ""
                        : "max-h-[calc(100vh-6rem)] overflow-auto "
                    }`}
                  >
                    <ResultDisplay
                      loading={loading}
                      result={result}
                      prompt={prompt}
                      handleTextChange={handleTextChange}
                      isStickyMode={isStickyMode}
                      horizontalLayout={horizontalLayout}
                    />
                  </div>
                </div>
              ) : (
                <>
                  {/* 垂直布局时的内容 (默认布局) */}

                  {/* 显示截图标题 */}
                  {!isStickyMode && (
                    <div className="pt-[2.5rem] ">
                      <Badge
                        variant="secondary"
                        className="mb-2 antialiased font-medium"
                      >
                        <ImageIcon className="w-5 h-5 mr-1" />
                        Screenshot
                      </Badge>
                    </div>
                  )}
                  {/* 显示截图 */}
                  <div
                    className={` ${
                      isStickyMode
                        ? "overflow-y-auto max-h-[calc(100vh-4rem)] px-4"
                        : "h-full px-4"
                    }`}
                  >
                    <ScreenshotDisplay
                      screenShotResult={screenShotResult}
                      showFloatingButton={showFloatingButton}
                      copyImageToClipboard={copyImageToClipboard}
                      imageCopied={imageCopied}
                      isStickyMode={isStickyMode}
                    />
                    {/* ActionButtons */}
                    {!horizontalLayout && (
                      <div className="py-4 -mx-4">
                        <ActionButtons
                          isStickyMode={isStickyMode}
                          loading={loading}
                          model={model}
                          result={result}
                          onError={onError}
                          screenShotResult={screenShotResult}
                          handlePromptChange={handlePromptChange}
                          recoginzeScreenshot={recoginzeScreenshot}
                          copyImageToClipboard={copyImageToClipboard}
                          imageCopied={imageCopied}
                          pinToScreen={pinToScreen}
                          clearScreenshot={clearScreenshot}
                          openApiKeyDialog={openApiKeyDialog}
                        />
                      </div>
                    )}

                    {/* 结果显示 */}

                    <div className="flex-1 w-full flex flex-col">
                      <ResultDisplay
                        loading={loading}
                        result={result}
                        prompt={prompt}
                        handleTextChange={handleTextChange}
                        isStickyMode={isStickyMode}
                        horizontalLayout={horizontalLayout}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* 非便签模式下显示对话框 */}
      {!isStickyMode && (
        <>
          <ApiKeyInput
            apikey={apiKey}
            onKeySave={handleApiKeyChange}
            open={openDialog}
            onOpenChange={handleOpenChange}
            model={model}
          />
          <LanguageInput
            language={language}
            onLanguageSave={handleLanguageChange}
            open={openLanguageDialog}
            onOpenChange={handleLanguageOpenChange}
          />
          <SettingsPage
            open={openSettings}
            onClose={() => setOpenSettings(false)}
            onSettingsUpdate={(settings) => {
              // Update layout setting immediately without restart
              if (settings.general.horizontalLayout !== undefined) {
                setHorizontalLayout(settings.general.horizontalLayout);
              }
            }}
          />
        </>
      )}

      <Toaster />

      {/* 便签模式下添加调整大小的手柄 */}
      {isStickyMode && (
        <div
          className="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
          onMouseDown={handleResizeStart}
        />
      )}
    </div>
  );
}

export default App;
