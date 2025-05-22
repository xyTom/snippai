/**
 * Centralized shortcut definitions for Snippai
 * ------------------------------------------------
 * 1. Keep all shortcut identifiers (action keys) in one place.
 * 2. Provide default accelerators and human-readable labels.
 * 3. Can be imported by BOTH renderer and main process for full consistency.
 */

// You can expand this union type whenever a new global shortcut is introduced.
export type ShortcutAction =
  | 'screenshot'
  | 'fullscreenScreenshot';

export interface ShortcutDefinition {
  /** Unique identifier used in settings & IPC path (e.g. shortcuts.{key}) */
  key: ShortcutAction;
  /** Default accelerator understood by electron globalShortcut */
  defaultAccelerator: string;
  /** Label used in the Settings UI */
  label: string;
}

export const SHORTCUT_DEFINITIONS: ShortcutDefinition[] = [
  {
    key: 'screenshot',
    defaultAccelerator: 'CommandOrControl+Shift+A',
    label: 'settings.shortcut_screenshot',
  },
  {
    key: 'fullscreenScreenshot',
    defaultAccelerator: 'CommandOrControl+Shift+F',
    label: 'settings.shortcut_fullscreen_screenshot',
  },
];

// Convenience map: { key: defaultAccelerator }
export const DEFAULT_SHORTCUTS: Record<ShortcutAction, string> = SHORTCUT_DEFINITIONS.reduce(
  (acc, cur) => {
    acc[cur.key] = cur.defaultAccelerator;
    return acc;
  },
  {} as Record<ShortcutAction, string>,
);

// Helper to get the UI label by key (useful for toast, etc.)
export function getShortcutLabel(action: ShortcutAction): string {
  return (
    SHORTCUT_DEFINITIONS.find((d) => d.key === action)?.label ?? action
  );
}

/**
 * Detect whether a candidate accelerator duplicates any existing shortcut.
 * @param shortcuts Current shortcut map
 * @param candidate Accelerator string to test (case-insensitive)
 * @param excludeAction Optional action to ignore in comparison (typically the action currently being edited)
 */
export function hasShortcutConflict(
  shortcuts: Record<ShortcutAction, string>,
  candidate: string,
  excludeAction?: ShortcutAction,
): boolean {
  return Object.entries(shortcuts).some(
    ([action, accelerator]) =>
      action !== excludeAction && accelerator.toLowerCase() === candidate.toLowerCase(),
  );
}

/**
 * Find which action conflicts with a given candidate accelerator.
 * Returns null if no conflict.
 */
export function getConflictingAction(
  shortcuts: Record<ShortcutAction, string>,
  candidate: string,
  excludeAction?: ShortcutAction,
): ShortcutAction | null {
  const entry = Object.entries(shortcuts).find(
    ([action, accelerator]) =>
      action !== excludeAction && accelerator.toLowerCase() === candidate.toLowerCase(),
  );
  return entry ? (entry[0] as ShortcutAction) : null;
}
