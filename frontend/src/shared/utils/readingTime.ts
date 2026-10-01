export function calculateReadingTime(text: string): number {
  if (!text || !text.trim()) return 1;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}
