# FlashMaster fdnext v2 UI Migration Plan

## Scope

Update FlashMaster to consume the updated `vendor/fdnext` v2 public API and render the new canonical result contract cleanly in the current dense workstation UI.

This plan keeps FlashMaster focused on the existing tool surface:

- Keep public routes: `/decode`, `/decodeId`, `/searchPn`, `/searchId`, `/settings`, `/about`.
- Keep both parser modes: embedded fdnext and fdnext 2.0 HTTP API.
- Drop old FlashDetector API payloads and old logical endpoint formats.
- Do not fetch or maintain an external server list; HTTP API mode uses the configured server address directly.
- Do not add a landing page or marketing-style screen.
- Do not copy fdnext source or resources out of `vendor/fdnext`.
- Do not commit generated `dist` output.

Current fdnext update under review:

- Submodule moved from `7176c5b` to `36fa208`.
- fdnext package version is now `2.0.0`.
- The old embedded contract is obsolete and should be removed: `embeddedResources`, `defaultFlashIdRules`, `compileFlashIdRulesToDecoders`, `flashIdDecoders`, and `engine.dispatch()` are no longer public v2 entrypoints.

## Target Contract

The only supported parser contract is fdnext 2.0. Embedded fdnext should use:

- `createEngine`
- `compileRulesToDecoders(defaultDslRules)`
- `compileIdentifierRulesToDecoders(defaultIdentifierRules)`
- `embeddedResourceBundle`
- `engine.decodePart(input)`
- `engine.searchParts(input)`
- `engine.decodeIdentifier(input)`
- `engine.searchIdentifiers(input)`
- `engine.getCapabilities()`

fdnext v2 results use:

- `schemaVersion: "fdnext.result.v1"`
- `operation: "part.decode" | "part.search" | "identifier.decode" | "identifier.search"`
- `status: "ok" | "not_found" | "ambiguous" | "unsupported" | "invalid_input"`
- `input`
- decode payload: `device`, `subtitle`, `blocks`, `relations`, `warnings`, optional `candidates`
- search payload: `items`, optional `relations`, `warnings`, optional `candidates`

HTTP API mode should use fdnext 2.0 server endpoints only:

- `GET /capabilities`
- `GET /parts/decode?query=...&lang=...`
- `GET /parts/search?query=...&lang=...&limit=...`
- `GET /identifiers/decode?query=...&lang=...`
- `GET /identifiers/search?query=...&lang=...&limit=...`

The following old API concepts should be deleted from FlashMaster's active parser path:

- old logical endpoints: `info`, `decode`, `decodeId`, `searchPn`, `searchId`, `summary`, `summaryId`
- old wrapper payloads such as `result/data/message`
- legacy string search-result parsing for fdnext responses
- external server-list fetching

## Phase 1: Embedded fdnext v2 Adapter

Goal: make embedded parser mode boot and return fdnext v2 results without changing page layout yet.

Status: Completed on 2026-05-10.

Completion notes:

- Replaced the embedded adapter with fdnext v2 imports and explicit engine operation calls.
- Removed embedded `engine.dispatch()` and old embedded logical endpoint wrappers.
- Switched the FlashMaster service facade to fdnext v2 HTTP operation routes for the same logical actions.
- Replaced summary endpoint calls with client-side summaries generated from canonical fdnext results.
- Verified `part.decode`, `part.search`, `identifier.decode`, and `identifier.search` return `fdnext.result.v1` objects from embedded mode.

Files:

- `src/services/fdnextApi.js`
- `src/services/flashApi.js`
- `vite.config.js` only if package aliases need adjustment

Tasks:

- Replace old fdnext imports with v2 names.
- Replace `engine.dispatch(endpoint, ...)` with explicit operation calls.
- Map FlashMaster service functions to fdnext v2 operations:
  - `decodePartNumber(pn)` -> `engine.decodePart({ query: pn, lang })`
  - `searchPartNumber(pn, limit)` -> `engine.searchParts({ query: pn, lang, limit })`
  - `decodeFlashId(id)` -> `engine.decodeIdentifier({ query: id, lang })`
  - `searchFlashId(id, limit)` -> `engine.searchIdentifiers({ query: id, lang, limit })`
  - `getServerInfo()` in embedded mode -> `engine.getCapabilities()` plus embedded version metadata if needed
- Remove old logical endpoint wrappers: `info`, `decode`, `decodeId`, `searchPn`, `searchId`, `summary`, `summaryId`.
- Remove old summary API calls. Generate copy summaries client-side from canonical fdnext results.
- Keep route names stable, but the service layer should expose fdnext 2.0 operation semantics rather than old FlashDetector semantics.

Acceptance:

- `pnpm lint`
- `pnpm exec vite build --outDir /tmp/flashmaster-fdnext-build-probe --emptyOutDir`
- Embedded calls return fdnext v2 result objects for one PN decode, one PN search, one Flash ID decode, and one Flash ID search.

## Phase 2: Canonical Result ViewModel

Goal: isolate fdnext v2 rendering logic from page components.

Files:

- Add `src/services/fdnextResultView.js` or similar
- Update `src/services/display.js` only for generic field formatting helpers
- Delete or shrink `src/services/resultParser.js` once raw string parsing is no longer needed

Tasks:

- Create helpers for:
  - detecting fdnext v2 results by `schemaVersion`
  - formatting `FieldValue` as `field.display ?? formatted value/unit ?? field.value`
  - flattening `blocks[].fields[]` into block cards and metric grids
  - extracting device identity from `device`
  - extracting relation actions from `relations[].action`
  - converting search `items[]` into table/card rows
  - converting warnings and candidates into compact UI rows
- Keep no semantic parsing of translated labels. Use `field.key`, `block.id`, `importance`, `device`, and `relation.kind`.
- Keep density/unit display consistent with fdnext `display` first. Only use FlashMaster unit preferences when fdnext does not provide a display string.
- Do not provide legacy FlashDetector adapters. HTTP mode must return the same fdnext 2.0 result contract as embedded mode.

Acceptance:

- Unit-like smoke checks with real fdnext fixture-shaped objects.
- No page component needs to know fdnext internals beyond ViewModel output.
- No old `result/data/message` response adapter remains in the fdnext path.

## Phase 3: Decode Page Rendering

Goal: update `/decode` to render `part.decode` results from canonical blocks and relations.

Files:

- `src/views/Decode.vue`
- Shared result components if introduced in Phase 2
- `src/services/vendorLogos.js` only if vendor normalization needs adjustment

Rendering rules:

- Top result panel:
  - vendor logo from `device.vendor.name` or `device.vendor.id`
  - primary identifier from `device.partNumber`
  - subtitle from `result.subtitle`
  - compact chips for `device.chipKind`, `device.productType`, and `result.status`
  - warning strip when `warnings.length > 0`
- Primary metrics:
  - use fields from blocks with `importance: "primary"`
  - prefer block order from fdnext
  - keep the layout dense and two-column friendly
- Secondary/detail panels:
  - `storage`, `dram`, `geometry`, `interface`, `package`, `components`, `controllers`, `marking`, `timing`, `additional`
  - detail blocks can use compact key-value tables or paged tables
- Relations:
  - `identifier_for` becomes Flash ID rows with decode action
  - `component` becomes component cards for eMCP/uMCP/storage+DRAM relationships
  - `uses_controller` becomes controller relation rows
  - `marking_for` becomes marking/FBGA relationship rows if present
- Copy behavior:
  - overview copy uses `subtitle`, device identity, and primary/secondary fields
  - detail copy uses rendered field labels and display values
- Empty/not found:
  - render `status` explicitly and do not show stale old result data

Acceptance:

- Embedded PN decode renders raw NAND, On-die ECC NAND, eMMC/UFS/eMCP, DRAM examples.
- Flash ID relation actions navigate to `/decodeId?id=...`.
- Copy buttons still work.

## Phase 4: Flash ID Decode Rendering

Goal: update `/decodeId` to render `identifier.decode` results using the same canonical block renderer.

Files:

- `src/views/DecodeId.vue`
- Shared result components/ViewModel

Rendering rules:

- Top result panel:
  - vendor logo from `device.vendor`
  - identifier from `device.identifier`
  - subtitle from `result.subtitle`
  - scheme chip from `device.idScheme` or `input.constraints.idScheme`
- Metrics:
  - use `geometry` as the primary Flash ID block
  - show `interface`, `timing`, and `controllers` as secondary/detail panels
- Relations:
  - `identifier_for` relations with `target.partNumber` become PN cards
  - use `relation.action` to navigate to `/decode?pn=...`
- Extra info:
  - stop rendering old `ext` directly when fdnext v2 blocks already cover the fields
  - show unknown detail fields only from canonical `additional` block

Acceptance:

- Embedded Flash ID decode renders vendor, geometry, timing, controllers, related PNs.
- Related PN cards navigate correctly.
- HTTP mode renders through the same fdnext 2.0 ViewModel when pointed at a fdnext server.

## Phase 5: Search Pages And Suggestions

Goal: update `/searchPn`, `/searchId`, and decode-page suggestions to use fdnext v2 `items[]`.

Files:

- `src/views/SearchPn.vue`
- `src/views/SearchId.vue`
- `src/views/Decode.vue`
- `src/views/DecodeId.vue`
- new ViewModel helper; delete old raw-result parser if it has no remaining use

Rendering rules for `part.search`:

- Row title: `item.label`
- Vendor: `item.device.vendor.name`
- Main PN: `item.device.partNumber || item.label`
- Marking/FBGA: `item.device.markingCode`
- Badges: `item.badges`, `device.chipKind`, `device.productType`
- Summary fields: `item.fields` with primary/secondary importance
- Action: use `relations[].action` matching the item when available, otherwise decode `device.partNumber`

Rendering rules for `identifier.search`:

- Row title: `item.label` or `item.device.identifier`
- Vendor: `item.device.vendor.name`
- Summary fields from `item.fields`
- Related PNs/controllers from `item.relations` and canonical controller fields
- Action: decode identifier via `device.identifier`

Autocomplete:

- Decode PN suggestions should use `part.search` items, not raw string parsing.
- Flash ID suggestions should use `identifier.search` items.
- Analytics must remain tied to explicit decode/search submit paths, not autocomplete traffic.

Acceptance:

- PN search renders direct PN hits and Micron FBGA marking hits.
- Flash ID search renders related PNs and controller metadata.
- Suggestions select the correct canonical query.

## Phase 6: fdnext 2.0 HTTP API Mode

Goal: keep HTTP API mode, but make it fdnext 2.0 only.

Files:

- `src/services/flashApi.js`
- `src/views/Settings.vue`
- `src/store/index.js`
- translations if new UI labels are needed

Tasks:

- Remove legacy FlashDetector endpoint calls entirely.
- Remove external server-list fetching and any UI flow that depends on `servers.json`.
- Keep a manual HTTP server address setting.
- Use only fdnext 2.0 routes:
  - `GET /capabilities`
  - `GET /parts/decode`
  - `GET /parts/search`
  - `GET /identifiers/decode`
  - `GET /identifiers/search`
- Send fdnext 2.0 query parameters directly: `query`, `lang`, `limit`, and optional constraints.
- Treat non-fdnext responses as unsupported HTTP parser errors.
- Surface parser type/version clearly in Settings.
- Generate copy summaries client-side rather than calling removed summary endpoints.

Acceptance:

- Embedded fdnext works.
- HTTP mode works against a fdnext 2.0 server.
- No code path fetches an external server list.
- No code path calls old endpoints: `decode`, `decodeId`, `searchPn`, `searchId`, `summary`, `summaryId`.

## Phase 7: Changelog, Version, And Documentation

Goal: document user-visible behavior changes from the fdnext update and UI renderer migration.

Files:

- `CHANGELOG.txt`
- `CHANGELOG-zh.txt`
- `README.md` only if commands or parser behavior documentation changes
- `package.json` only if the app version is intentionally bumped

Tasks:

- Add top changelog entries summarizing:
  - fdnext v2 embedded parser update
  - fdnext v2 HTTP API-only mode
  - removal of old FlashDetector API compatibility and external server-list fetching
  - canonical result rendering
  - improved NAND topology fields
  - localized decode subtitles
  - relations-based actions
  - expanded DRAM/Managed NAND/Flash ID rendering if visible
- Do not manually edit `FDNEXT_VERSION`.
- If app version is bumped, remember build metadata appends the FlashMaster git short hash automatically.

Acceptance:

- Changelog dialog shows the new top entry in both languages.
- Version and fdnext version display remain correct.

## Phase 8: Verification And Smoke Testing

Goal: validate the migration end to end before handoff.

Automated checks:

```bash
pnpm lint
pnpm build
```

Local browser smoke:

- `pnpm dev`
- Embedded PN decode
- Embedded Flash ID decode
- Embedded PN search
- Embedded Flash ID search
- Micron FBGA/marking search result navigation
- Settings parser version display
- Settings persistence
- Language switching
- Theme switching
- Changelog dialog behavior
- Copy buttons
- Market ticker enable/disable behavior
- fdnext 2.0 HTTP parser mode when a fdnext server is available

Suggested sample inputs:

- PN raw NAND: `MT29F4G08ABAEA`
- PN On-die ECC NAND: `MT29FBG08ABACA`
- PN eMMC: `MTFC8GAKAJCN-4M`
- PN UFS: `KLUEG8UHDC-B0E1`
- PN eMCP: `BWCA2KZC-64G`
- PN DRAM: `MT62F1G64D4EK-023 WT:B`
- Flash ID: `2C DA 90 95 56`
- FBGA marking search: `NW101`

## Implementation Order

1. Phase 1: restore embedded fdnext operation calls.
2. Phase 2: build canonical ViewModel helpers.
3. Phase 3 and Phase 4: migrate decode pages.
4. Phase 5: migrate search pages and suggestions.
5. Phase 6: switch HTTP mode to fdnext 2.0 endpoints only and remove external server-list fetching.
6. Phase 7: update changelogs/docs/version only where needed.
7. Phase 8: run verification and browser smoke.

Do not start broad visual redesign until the fdnext v2 data path and canonical renderer are stable.
