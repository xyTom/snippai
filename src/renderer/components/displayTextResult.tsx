import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import React, { useEffect, useRef, useState, ChangeEvent, useMemo } from "react";
import { CalendarCheck, CalendarPlus } from "lucide-react";
import { useToast } from "./ui/use-toast";
import { MarkdownTableParser } from "../../services/parser/markdownParser";
import { ExcelExportServiceFactory } from "../../services/excel/factory";
import { useTranslation } from 'react-i18next';

interface DisplayTextResultProps {
  text: string;
  onTextChange: (text: string) => void;
  prompt: string;
  isStickyMode?: boolean;
  horizontalLayout?: boolean;
}

export default function DisplayTextResult({
  text,
  onTextChange,
  prompt,
  isStickyMode = false,
  horizontalLayout = false,
}: DisplayTextResultProps) {
  const { toast } = useToast();
  const { t } = useTranslation();

  const [copied, setCopied] = useState(false);
  const [exported, setExported] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [calendarSaved, setCalendarSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const parseMarkdownTables = useMemo(() => {
    return MarkdownTableParser.parseTables(text);
  }, [text]);

  const containsTable = useMemo(() => {
    return parseMarkdownTables.length > 0;
  }, [parseMarkdownTables]);

  const calendarText = useMemo(() => {
    const match = text.match(/BEGIN:VCALENDAR[\s\S]*END:VCALENDAR/i);
    return match?.[0] ?? "";
  }, [text]);

  const containsCalendar = prompt === "Calendar" && Boolean(calendarText);

  const handleTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onTextChange(event.target.value);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  const handleExport = async () => {
    const tables = parseMarkdownTables;

    // Should not show export button, but keep the toast in case errors occur
    if (tables.length === 0) {
      toast({
        title: t('export.no_tables_found'),
        description: t('export.no_tables_found_description'),
        variant: "destructive",
      });
      return;
    }

    try {
      setIsExporting(true);
      
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const timeStr = now.getTime().toString();
      const fileName = `snippai-table-${dateStr}-${timeStr}.xlsx`;

      const exportService = ExcelExportServiceFactory.getService();
      const result = await exportService.exportTables(tables, fileName);

      if (result.success) {
        setExported(true);
        toast({
          title: t('export.success'),
          description: t('export.success_description', { 
            count: tables.length,
            fileName: result.fileName || fileName,
            postProcess: 'interval'
          }),
          variant: "default",
        });
      } else if (result.cancelled) {
        // User cancelled the operation, don't show any toast
        console.log('Export cancelled by user');
      } else {
        // Export failed
        toast({
          title: t('export.failed'),
          description: t('export.failed_description'),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t('export.failed'),
        description: t('export.failed_description'),
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
      setTimeout(() => setExported(false), 1000);
    }
  };

  const handleCalendarExport = () => {
    if (!calendarText) return;

    const blob = new Blob([calendarText], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `snippai-event-${Date.now()}.ics`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    setCalendarSaved(true);
    setTimeout(() => setCalendarSaved(false), 1000);
  };

  // 自动调整文本框高度的函数
  const adjustTextareaHeight = () => {
    // 在钉图模式或水平布局模式下不自动调整高度
    if (isStickyMode || horizontalLayout) return;

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
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
        height: '100%',
        minHeight: '300px',
        maxHeight: '600px',
        overflowY: 'auto' as const
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

  const buttonContainerClasses = [
    "flex",
    "w-full",
    "gap-2",
  ].join(" ");

  const buttonClasses = [
    "flex-1",
    isStickyMode ? "h-8 py-0" : "",
  ].filter(Boolean).join(" ");

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
      <div className={buttonContainerClasses}>
        <Button
          variant="outline"
          size={isStickyMode ? "sm" : "default"}
          className={buttonClasses}
          onClick={handleCopy}
          disabled={isExporting}
        >
          {copied ? (
            <ClipboardCheckIcon className={iconSize} />
          ) : (
            <ClipboardIcon className={iconSize} />
          )}
          <span>{t('copy')}</span>
        </Button>
        {containsTable && (
          <Button
            variant="outline"
            size={isStickyMode ? "sm" : "default"}
            className={buttonClasses}
            onClick={handleExport}
            disabled={isExporting}
          >
            {exported ? (
              <ExportToExcelCheckIcon className={iconSize} />
            ) : (
              <ExportToExcelIcon className={iconSize} />
            )}
            <span>{isExporting ? "Exporting..." : "Export as Excel"}</span>
          </Button>
        )}
        {containsCalendar && (
          <Button
            variant="outline"
            size={isStickyMode ? "sm" : "default"}
            className={buttonClasses}
            onClick={handleCalendarExport}
            disabled={isExporting}
          >
            {calendarSaved ? (
              <CalendarCheck className={iconSize} />
            ) : (
              <CalendarPlus className={iconSize} />
            )}
            <span>{t("calendar.save_ics")}</span>
          </Button>
        )}
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

const ExportToExcelIcon = (props: React.SVGProps<SVGSVGElement>) => (
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
    <path d="M12 2v6" />
    <path d="M8 6l4 4 4-4" />
    <rect x="4" y="12" width="16" height="8" rx="1" />
    <path d="M8 12v8" />
    <path d="M16 12v8" />
    <path d="M4 16h16" />
  </svg>
);


const ExportToExcelCheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
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
    <path d="M12 2v6" />
    <path d="M8 6l4 4 4-4" />
    <rect x="4" y="10" width="16" height="10" rx="2" />
    <path d="m9 14 2 2 4-4" />
  </svg>
);
