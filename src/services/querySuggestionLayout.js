const MENU_GAP = 2;
const MENU_MAX_HEIGHT = 310;
const MENU_EXPANDED_WIDTH = 560;
const MENU_VIEWPORT_MARGIN = 12;

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(value, maximum));
}

// All coordinates are CSS pixels in the same client coordinate system.
export function querySuggestionLayout(field, viewport, minimumHeight = 0, contentWidth = 0) {
  const top = field.bottom + MENU_GAP;
  const maxHeight = Math.max(0, Math.min(MENU_MAX_HEIGHT, viewport.bottom - top));
  const viewportWidth = Math.max(0, viewport.right - viewport.left);
  const fieldWidth = Math.min(field.width, viewportWidth);
  const requestedWidth = Math.max(fieldWidth, Math.min(MENU_EXPANDED_WIDTH, contentWidth));
  const expandedWidth = Math.min(
    requestedWidth,
    Math.max(0, viewportWidth - (MENU_VIEWPORT_MARGIN * 2))
  );
  const canExpand = expandedWidth > fieldWidth;
  const width = canExpand ? expandedWidth : fieldWidth;
  const horizontalMargin = canExpand ? MENU_VIEWPORT_MARGIN : 0;
  const minimumLeft = viewport.left + horizontalMargin;
  const maximumLeft = viewport.right - horizontalMargin - width;
  const left = clamp(field.left, minimumLeft, maximumLeft);

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
