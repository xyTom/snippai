import * as React from 'react';
import { X } from "lucide-react";
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useToast } from '../ui/use-toast';

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Base interface for all application settings
 */
export interface AppSettings {
  shortcuts: ShortcutSettings;
  general: GeneralSettings;
}

/**
 * Interface for keyboard shortcut settings
 */
export interface ShortcutSettings {
  screenshot: string;
}

/**
 * Interface for general application settings
 */
export interface GeneralSettings {
  autoCopyToClipboard: boolean;
}

interface ShortcutRecorderProps {
  shortcutKey: keyof ShortcutSettings;
  label: string;
  value: string;
  onChange: (key: keyof ShortcutSettings, value: string) => void;
  onReset?: () => void; // 可选的重置功能
}

/**
 * Component for recording keyboard shortcuts
 */
const ShortcutRecorder: React.FC<ShortcutRecorderProps> = ({
  shortcutKey,
  label,
  value,
  onChange,
  onReset
}) => {
  const [isRecording, setIsRecording] = React.useState<boolean>(false);
  const { toast } = useToast();

  /**
   * Set up key event listener for shortcut recording
   */
  React.useEffect(() => {
    // Map of special keys to their display names
    const specialKeyMap: Record<string, string> = {
      'ArrowUp': 'Up',
      'ArrowDown': 'Down',
      'ArrowLeft': 'Left',
      'ArrowRight': 'Right',
      'Escape': 'Esc',
      ' ': 'Space',
      'Backspace': 'Backspace',
      'Tab': 'Tab',
      'Delete': 'Del',
      'Home': 'Home',
      'End': 'End',
      'PageUp': 'PgUp',
      'PageDown': 'PgDn',
      'Insert': 'Ins',
      'Enter': 'Enter',
      'CapsLock': 'CapsLock',
      'ContextMenu': 'Menu'
    };
    
    // List of system shortcuts to warn about
    const systemShortcuts = [
      'Control+C',
      'Control+V',
      'Control+X',
      'Control+A',
      'Control+Z',
      'Command+C',
      'Command+V',
      'Command+X',
      'Command+A',
      'Command+Z',
      'Command+Q',
      'Command+W',
      'Command+Space'
    ];

    // Debounced version of the key handler to prevent multiple rapid recordings
    const debouncedKeyHandler = debounce((e: KeyboardEvent): void => {
      if (!isRecording) return;

      e.preventDefault();

      // Build shortcut string
      const keys: string[] = [];
      if (e.ctrlKey) keys.push('Control');
      if (e.metaKey) keys.push('Command');
      if (e.altKey) keys.push('Alt');
      if (e.shiftKey) keys.push('Shift');

      // Add the pressed key if it's not a modifier
      const modifierKeys = ['Control', 'Meta', 'Alt', 'Shift'];
      let keyName = e.key;
      
      // Map special keys to their display names
      if (specialKeyMap[keyName]) {
        keyName = specialKeyMap[keyName];
      } else if (!modifierKeys.includes(keyName)) {
        // For regular keys, use uppercase
        keyName = keyName.length === 1 ? keyName.toUpperCase() : keyName;
      }
      
      // Don't add the key if it's a modifier that's already been added
      if (!modifierKeys.includes(keyName)) {
        keys.push(keyName);
      }

      // Only save if we have at least one modifier and one regular key
      if (keys.length >= 2 && !modifierKeys.includes(keys[keys.length - 1])) {
        const newShortcut = keys.join('+');
        
        // Check if this is a system shortcut
        if (systemShortcuts.includes(newShortcut)) {
          toast({
            title: "System shortcut detected",
            description: `Warning: ${newShortcut} is a system shortcut. Using it may interfere with system operations.`,
            variant: "destructive"
          });
        }
        
        onChange(shortcutKey, newShortcut);
        setIsRecording(false);
        
        toast({
          title: "Shortcut recorded",
          description: `New shortcut: ${newShortcut}`,
        });
      }
    }, 300); // 300ms debounce time
    
    // The actual event handler that calls the debounced function
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (!isRecording) return;
      e.preventDefault();
      debouncedKeyHandler(e);
    };

    if (isRecording) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRecording, shortcutKey, onChange, toast]);

  /**
   * Start or stop recording a new shortcut
   */
  const handleRecording = (): void => {
    // If already recording, stop recording
    if (isRecording) {
      setIsRecording(false);
      toast({
        title: "Recording cancelled",
        description: "Shortcut recording has been cancelled.",
      });
      return;
    }
    
    // Start recording
    setIsRecording(true);
    
    toast({
      title: "Press shortcut combination",
      description: "Press the key combination you want to use. Must include at least one modifier key.",
    });
  };

  return (
    <div className="space-y-3 p-4 rounded-md bg-muted/10">
      <div className="flex justify-between items-center">
        <Label htmlFor={`${shortcutKey}-shortcut`} className="text-sm font-medium">{label}</Label>
        <div className="flex items-center gap-1">
          {isRecording && (
            <span className="text-xs text-red-500 animate-pulse">Recording...</span>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <Input
          id={`${shortcutKey}-shortcut`}
          value={value}
          readOnly
          className="flex-1 h-9"
          placeholder="Click record button to set shortcut"
        />
        {onReset && (
          <Button 
            onClick={onReset}
            variant="outline"
            size="sm"
            className="gap-1 text-xs"
            title="Reset to default shortcut"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
            <span className="hidden sm:inline">Reset</span>
          </Button>
        )}
        <Button 
          onClick={handleRecording}
          variant={isRecording ? "destructive" : "secondary"}
          size="sm"
          className="gap-1"
        >
          {isRecording ? (
            <>
              <X className="h-4 w-4" />
              Stop
            </>
          ) : (
            'Record'
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Press the key combination you want to use. Must include at least one modifier key (Ctrl, Alt, Shift, or Command).
      </p>
    </div>
  );
};

export default ShortcutRecorder;
