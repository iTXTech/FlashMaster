# FlashMaster Agent Guide

FlashMaster is a dense memory-chip lookup workstation built with Vite, Vue 3,
Vuetify, Vue Router, and Vue I18n. Keep the first screen directly usable for PN
and NAND Flash ID decoding/search; do not add a marketing landing page.

## Task scope and completion

- Carry an implementation request through the local change, relevant checks,
  and fixes for failures it causes. Routine reversible work within that scope
  does not need another approval. Ask only when missing information materially
  changes the result or an action needs authorization not already given.
- An audit-only or proposal-only request stays read-only. Preserve unrelated
  work in the checkout; do not reset it to simplify the task.
- `commit` means a scoped local commit. `commit all` includes the worktree after
  reviewing its contents for unintended files and secrets. Neither implies
  push, deployment, or release; follow explicit authorization already given.
- Read the source and documentation relevant to the change. The links below
  are task-specific references, not a required reading sequence.
- Explicit user instructions override workflow defaults in this guide and
  project skills. If a rule blocks the requested work, cite its file and wording
  and explain the specific decision needed; do not invent an approval gate.

## Toolchain

- Use `pnpm`; `package.json` defines the package-manager version and scripts.
  Development starts with `pnpm dev`; preview uses `pnpm preview`.
- When updating dependencies, prefer the latest compatible versions and keep
  `package.json` and `pnpm-lock.yaml` together. Do not upgrade unrelated
  dependencies as part of another task. Document an older major only when a
  known compatibility constraint requires it.
- Register only used Vuetify components/directives manually in `src/main.js`.
  Do not use wildcard registrations or add `vite-plugin-vuetify` unless asked.
  Keep the current Vite/Vue stack; do not reintroduce Vue CLI, webpack, Yarn,
  or Vue 2.

## Product and integration boundaries

- UI queries go through `src/services/flashApi.js`. Preserve embedded fdnext
  and the configured HTTP backend, including decode, search, info, and summary
  behavior. Pico builds remain HTTP-only.
- `vendor/fdnext` is an upstream Git submodule. Do not edit it without an
  explicit upstream patch request, copy its source/resources into the app, or
  replace it with `../fdnext`. Preserve the `@itxtech/fdnext-core` and
  `@itxtech/fdnext-decodepack` aliases unless upstream changes its layout.
- Preserve public routes in hash/history modes and `/en`/`/zh` URL prefixes.
  Keep settings persistence compatible through `src/store/index.js`.
- Preserve the compact navigation, title/language area, settings, result
  panels, paged tables, and copy actions. Theme choices are dark, light, and
  system in Settings. Footer: `© 2019-2026 iTX Technologies`.
- Market Pulse stays optional, quiet, and easy to disable. Keep visible-slot
  rendering, CSS-driven scrolling, and suspension while the document is hidden.
- Query analytics involve user input. Any expansion must be transparent, offer
  a Settings control, and prefer aggregated or normalized data. Do not silently
  introduce an external analytics provider or endpoint.

## Verification

- Documentation/instruction-only changes need diff, link, and factual checks;
  validate skill metadata when changed. They do not require app builds or UI
  smoke tests unless they also change runtime behavior.
- For application code, dependencies, build configuration, or an fdnext pointer
  update, run `pnpm lint` and `pnpm build`, plus affected existing tests where
  applicable. Add regression tests for meaningful behavior, not wording or
  trivial changes that only mirror the implementation.
- UI changes also need a browser check of the affected flow and relevant
  viewport/settings states. Use the [verification matrix](docs/DEVELOPMENT.md#验证选择)
  to select tests and build variants; a small UI edit does not require every
  unrelated feature to be exercised.
- Once relevant checks pass, repeat or broaden them only for new changes,
  failures, or unresolved risks. Respect an explicit request to skip tests and
  report what was not verified. An unavailable HTTP server is a verification
  gap; mocked requests or a successful build do not prove live compatibility.
- Do not commit generated `dist` or `dist-singlefile` output unless requested.

## Documentation and versions

- Keep `README.md` and `README-zh.md` content synchronized as concise overviews.
  Detailed docs belong in `docs/`, in Chinese unless English is requested.
- Add user-visible release changes at the top of both `CHANGELOG.txt` and
  `CHANGELOG-zh.txt`; preserve older entries. Agent-guidance-only edits do not
  need an application version bump or product changelog entry.
- The base app version lives in `package.json`; `vite.config.js` derives app
  and fdnext version/hash displays. Do not hand-edit injected version constants.
  Changelog seen-state uses the base version without build metadata.

## Task-specific references

- Updating the bundled parser: use
  [flashmaster-fdnext-update](.agents/skills/flashmaster-fdnext-update/SKILL.md).
  Ordinary UI/parser-adapter work does not itself call for a submodule refresh.
- Changing routes, parser contracts, UI/state, or Market Pulse: read the relevant
  section of [development contracts](docs/DEVELOPMENT.md).
- Changing single-file, PWA, hosting, or release behavior: use
  [deployment guidance](docs/DEPLOYMENT.md) and the current `vite.config.js` or
  `.github/workflows/release.yml` for the affected mode.

Report the result concisely in the user's language: what changed, what was
actually verified, and any remaining limitation or required decision.
