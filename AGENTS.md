# Step 1 Implementation Plan

## Summary

Only implement Step 1: migrate FlashMaster to Vite, Vue 3, Vuetify 3, and pnpm, then refresh the UI into a dense workstation layout. Do not integrate `../fdnext` as a direct browser library in this step. Existing FlashDetector HTTP API calls remain the data boundary.

## Key Changes

- Use uppercase `AGENTS.md` as the implementation note for this phase.
- Replace Vue CLI 4, webpack 4, Vue 2, and Yarn with Vite, Vue 3, Vuetify 3, and pnpm.
- Keep the existing public routes: `/decode`, `/decodeId`, `/searchPn`, `/searchId`, `/settings`, and `/about`.
- Preserve FlashDetector HTTP API behavior for `info`, `decode`, `decodeId`, `searchPn`, `searchId`, `summary`, and `summaryId`.
- Rework the first screen as a practical tool surface, not a landing page.

## Test Plan

- Run `pnpm install`.
- Run `pnpm lint`.
- Run `pnpm build`.
- Start `pnpm dev`.
- Manually verify PN decode/search, FlashId decode/search, language switching, theme switching, settings persistence, and copy actions.
