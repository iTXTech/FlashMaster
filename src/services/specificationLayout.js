// Include the gaps covered by a spanning field, and allow a pixel for rounding.
export function specificationColumnSpan(requiredWidth, columnWidth, gap, columns) {
  if (columnWidth <= 0 || columns <= 1) return 1;
  return Math.min(columns, Math.max(1, Math.ceil((requiredWidth + 1 + gap) / (columnWidth + gap))));
}
