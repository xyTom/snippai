const MAC_PLATFORMS = new Set(["MacIntel", "MacPPC", "Mac68K"]);

const normalizeModifier = (value: string): string => {
  const key = value.trim();
  const isMac = MAC_PLATFORMS.has(window.navigator.platform);

  if (/^(commandorcontrol|cmdorctrl)$/i.test(key)) {
    return isMac ? "Command" : "Ctrl";
  }
  if (/^(control|ctrl)$/i.test(key)) return "Ctrl";
  if (/^(command|cmd|meta)$/i.test(key)) return "Command";
  if (/^(option|alt)$/i.test(key)) return "Alt";
  if (/^shift$/i.test(key)) return "Shift";

  return key.length === 1 ? key.toUpperCase() : key;
};

export const formatAccelerator = (accelerator: string): string =>
  accelerator
    .split("+")
    .map(normalizeModifier)
    .filter(Boolean)
    .join(" + ");
