# Design QA: adaptive query suggestions

## Evidence

- Source visual truth: `/var/folders/0b/5xbmymnd2490z3bbnlwqldgh0000gn/T/codex-clipboard-09f19ebb-f1ab-43ef-b8a2-c58d6f5a5577.png`
- Implementation screenshot: `/Users/peratx/.codex/visualizations/2026/09/03/01a06814-2718-7762-8736-463aab74cad7/flashmaster-adaptive-dark-menu.png`
- Focused comparison: `/Users/peratx/.codex/visualizations/2026/09/03/01a06814-2718-7762-8736-463aab74cad7/flashmaster-adaptive-comparison.png`
- Browser viewport: 1280 x 720 CSS px; browser screenshot: 1280 x 720 px.
- Source crop: 760 x 892 px at 2x density, normalized to 380 x 446 px. Implementation focus crop: 470 x 446 px at browser screenshot density.
- State: Chinese UI, dark theme, embedded parser, `EE29F` entered, suggestion menu open.

## Full-view comparison

The implementation preserves the existing workstation layout, query-panel width, menu height, colors, typography, borders, and two-line candidate structure. The only intentional composition change is the wider temporary overlay.

## Focused comparison

The source menu is constrained to the 302px input width and truncates the visible candidate titles. The implementation measures all rendered candidates and expands this result set to 413px, keeping the left edge anchored to the input and showing all ten candidate titles without truncation. The 560px cap and 12px viewport margin remain available for longer content and constrained viewports.

## Findings

- No actionable P0, P1, or P2 mismatch remains.
- Fonts and typography: unchanged from the source; title and subtitle hierarchy is preserved.
- Spacing and layout rhythm: input and panel sizing remain unchanged; the menu expands only while open.
- Colors and visual tokens: unchanged and visually consistent in dark theme.
- Image quality and assets: no image or icon assets changed.
- Copy and content: unchanged; full candidate strings are now visible when space permits.
- Interaction: typing opens the menu, Arrow Down focuses the first candidate, and Escape closes it.
- Responsive behavior: at 390 x 844 CSS px the menu is limited to 366px between 12px viewport margins; overflow is contained and longer titles retain ellipsis.
- Browser console: no warnings or errors observed in the tested wide and narrow states.

## Comparison history

- Initial finding: fixed 560px expansion used spare space but over-expanded shorter candidate sets.
- Fix: derive the requested width from the longest rendered candidate, then cap it at 560px and the available viewport.
- Post-fix evidence: `EE29F` resolves to a 413px menu for a 302px field with zero truncated titles at 1280px viewport width.

## Follow-up polish

No P3 follow-up is required for this scoped change.

final result: passed
