/** Wählt Schwarz oder Weiß als lesbare Textfarbe auf einem gegebenen Hex-Hintergrund. */
export function readableTextColor(hex: string): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map((ch) => ch + ch).join('')
    : clean.padEnd(6, '0');

  const r = parseInt(full.substring(0, 2), 16) || 0;
  const g = parseInt(full.substring(2, 4), 16) || 0;
  const b = parseInt(full.substring(4, 6), 16) || 0;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.6 ? '#111111' : '#f5f5f5';
}
