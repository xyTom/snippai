import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import React, { useEffect, useRef, useState, ChangeEvent } from "react";

interface DisplayTextResultProps {
  text: string;
  onTextChange: (text: string) => void;
  isStickyMode?: boolean;
  horizontalLayout?: boolean;
}

export default function DisplayTextResult({
  text,
  onTextChange,
  isStickyMode = false,
  horizontalLayout = false,
}: DisplayTextResultProps) {
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onTextChange(event.target.value);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  // 自动调整文本框高度的函数
  const adjustTextareaHeight = () => {
    // 在钉图模式或水平布局模式下不自动调整高度
    if (isStickyMode || horizontalLayout) return;

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  // 当文本内容变化时调整高度
  useEffect(() => {
    adjustTextareaHeight();
  }, [text, isStickyMode, horizontalLayout]);

  // 计算特定模式下的样式和属性
  const getTextareaStyles = () => {
    if (isStickyMode) {
      return {
        height: "auto",
        overflowY: "auto" as const,
        fontSize: "0.9rem",
      };
    }

    if (horizontalLayout) {
      return {
        maxHeight: "100%",
        overflowY: "auto" as const,
      };
    }

    return undefined;
  };

  // Compute class names based on props
  const containerClasses = [
    "flex w-full min-w-60 flex-col max-h-full",
    isStickyMode ? "pt-2 gap-1" : "gap-2",
    !horizontalLayout && !isStickyMode ? "min-h-70" : "",
    horizontalLayout ? "h-full" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const textareaClasses = [
    "w-full antialiased font-medium",
    isStickyMode ? "text-sm" : "text-lg",
    isStickyMode || horizontalLayout ? "" : "overflow-hidden",
    horizontalLayout ? "!h-full " : "",
  ]
    .filter(Boolean)
    .join(" ");

  const iconSize = isStickyMode ? "w-4 h-4" : "w-5 h-5";

  return (
    <div className={containerClasses}>
      <Textarea
        ref={textareaRef}
        value={text}
        className={textareaClasses}
        onChange={handleTextChange}
        style={getTextareaStyles()}
      />
      <div className="sticky bottom-0 bg-black mt-2 pb-2">
        <Button
          variant="outline"
          size={isStickyMode ? "sm" : "default"}
          className="w-full"
          onClick={handleCopy}
        >
          {copied ? (
            <ClipboardCheckIcon className={iconSize} />
          ) : (
            <ClipboardIcon className={iconSize} />
          )}
          <span>Copy</span>
        </Button>
      </div>
    </div>
  );
}

// Icon components
type IconProps = React.SVGProps<SVGSVGElement>;

const ClipboardCheckIcon = (props: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="green"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="m9 14 2 2 4-4" />
  </svg>
);

const CheckIcon = (props: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="green"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ClipboardIcon = (props: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
  </svg>
);
