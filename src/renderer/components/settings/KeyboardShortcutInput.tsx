import * as React from 'react';
import { RotateCcw, X } from "lucide-react";
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useToast } from '../ui/use-toast';
import { ShortcutAction, getConflictingAction } from '../../../shared/shortcuts';
import { useTranslation } from 'react-i18next';

// Utility function for debouncing
function debounce<T extends unknown[]>(func: (...args: T) => void, wait: number): (...args: T) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: T) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Props for the KeyboardShortcutInput component
 */
interface KeyboardShortcutInputProps {
  shortcutKey: ShortcutAction;
  label: string;
  value: string;
  shortcuts: Record<ShortcutAction, string>;
  onChange: (key: ShortcutAction, value: string) => void;
  onReset?: () => void; // 可选的重置功能
  disabled?: boolean;
}

/**
 * Component for recording and managing keyboard shortcuts
 * Provides an interactive UI for users to set custom keyboard shortcuts
 */
const KeyboardShortcutInput: React.FC<KeyboardShortcutInputProps> = ({
  shortcutKey,
  label,
  value,
  shortcuts,
  onChange,
  onReset,
  disabled = false,
}) => {
  const [isRecording, setIsRecording] = React.useState<boolean>(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  // Store special key mappings outside of the effect to avoid recreating on each render
  const specialKeyMap = React.useMemo<Record<string, string>>(() => ({
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
  }), []);
  
  // List of system shortcuts to warn about - also memoized
  const systemShortcuts = React.useMemo(() => [
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
  ], []);

  /**
   * Set up key event listener for shortcut recording
   */
  React.useEffect(() => {
    if (!isRecording || disabled) return;
    
    // Debounced version of the key handler to prevent multiple rapid recordings
    const debouncedKeyHandler = debounce((e: KeyboardEvent): void => {
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

        const conflictAction = getConflictingAction(shortcuts, newShortcut, shortcutKey);
        if (conflictAction) {
          setIsRecording(false);
          toast({
            title: t('settings.shortcut_conflict', { shortcut: newShortcut }),
            description: t('settings.shortcut_conflict_description', {
              shortcut: newShortcut,
            }),
            variant: 'destructive'
          });
          return;
        }
        
        // Check if this is a system shortcut
        if (systemShortcuts.includes(newShortcut)) {
          toast({
            title: t('settings.shortcut_system_detected', { shortcut: newShortcut }),
            description: t('settings.shortcut_system_detected_description', { shortcut: newShortcut }),
            variant: "destructive"
          });
        }
        
        onChange(shortcutKey, newShortcut);
        setIsRecording(false);

        toast({
          title: t('settings.shortcut_recorded'),
          description: t('settings.shortcut_recorded_description', { shortcut: newShortcut }),
        });
      }
    }, 300); // 300ms debounce time
    
    // The actual event handler that calls the debounced function
    const handleKeyDown = (e: KeyboardEvent): void => {
      e.preventDefault();
      debouncedKeyHandler(e);
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup function
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRecording, disabled, shortcutKey, shortcuts, onChange, toast, t, specialKeyMap, systemShortcuts]);

  /**
   * Start or stop recording a new shortcut
   */
  const handleRecording = (): void => {
    if (disabled) return;

    // If already recording, stop recording
    if (isRecording) {
      setIsRecording(false);
      toast({
        title: t('settings.shortcut_recording_cancelled'),
        description: t('settings.shortcut_recording_cancelled_description'),
      });
      return;
    }
    
    // Start recording
    setIsRecording(true);
    
    toast({
      title: `${t('settings.shortcut_press_combination')}`,
      description: `${t('settings.shortcut_press_combination_description')}`,
    });
  };

  return (
    <div className={`space-y-3 p-4 rounded-md bg-muted/10 ${disabled ? 'opacity-60' : ''}`}>
      <div className="flex justify-between items-center">
        <Label htmlFor={`${shortcutKey}-shortcut`} className="text-sm font-medium">{label}</Label>
        <div className="flex items-center gap-1">
          {isRecording && (
            <span className="text-xs text-red-500 animate-pulse">{t('settings.recording')}</span>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <Input
          id={`${shortcutKey}-shortcut`}
          value={value}
          readOnly
          disabled={disabled}
          className="flex-1 h-9"
          placeholder={t('settings.shortcut_placeholder')}
        />
        {onReset && (
          <Button 
            onClick={onReset}
            variant="outline"
            size="sm"
            disabled={disabled}
            className="gap-1 text-xs"
            title={t('settings.reset')}
          >
            <RotateCcw className="h-3 w-3" />
            <span className="hidden sm:inline">{t('settings.reset')}</span>
          </Button>
        )}
        <Button 
          onClick={handleRecording}
          variant={isRecording ? "destructive" : "secondary"}
          size="sm"
          disabled={disabled}
          className="gap-1"
        >
          {isRecording ? (
            <>
              <X className="h-4 w-4" />
              <p>{t('settings.stop')}</p>
            </>
          ) : (
            <p>{t('settings.record')}</p>
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {t('settings.shortcut_description')}
      </p>
    </div>
  );
};

export default KeyboardShortcutInput;
