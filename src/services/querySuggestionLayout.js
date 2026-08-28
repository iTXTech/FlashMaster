const MENU_GAP = 2;
const MENU_MAX_HEIGHT = 310;

// All coordinates are CSS pixels in the same client coordinate system.
export function querySuggestionLayout(field, viewport, minimumHeight = 0) {
  const top = field.bottom + MENU_GAP;
  const maxHeight = Math.max(0, Math.min(MENU_MAX_HEIGHT, viewport.bottom - top));
  const width = Math.min(field.width, viewport.right - viewport.left);
  const left = Math.max(viewport.left, Math.min(field.left, viewport.right - width));

  return {
    top,
    left,
    width,
    maxHeight,
    fits: field.width > 0
      && field.bottom > field.top
      && field.top >= viewport.top
      && field.bottom <= viewport.bottom
      && width > 0
      && maxHeight > 0
      && maxHeight >= minimumHeight
  };
}
