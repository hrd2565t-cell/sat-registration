---
name: sat-verify-and-deploy
description: >-
  Run the SAT Registration project verification, 4-aspect quality checklist, and
  safe Windows Git commit/push workflow before delivering any code change. Use
  when finishing an implementation or bug fix in this repository and preparing
  to commit and push to main.
---

# SAT Verify and Deploy

Use this workflow before finishing any code modification in the SAT Registration repository.

## 1. Static & Functional Verification

1. Run full TypeScript checking from the workspace root:
   ```powershell
   npx tsc --noEmit
   ```
2. Scan all TSX components for React Rules-of-Hooks violations (hooks after early return or inside conditionals/loops) using the bundled AST checker:
   ```powershell
   node .agents/skills/sat-verify-and-deploy/scripts/check-hooks.cjs
   ```
3. Run zero-warning ESLint verification on all modified or newly created TypeScript/TSX files:
   ```powershell
   npx eslint --max-warnings=0 <changed-files>
   ```
   - Keep code compliant with React 19 rules (`react-hooks/set-state-in-effect`: prefer `key`-based remount or derived values over synchronous `setState` in `useEffect`; `react-hooks/immutability`: declare `useState` hooks before any `useEffect` referencing their setters).
4. If course rules, document checklist conditions, province matching, or association coverage logic changed, compile the modified module and run Node `assert` verification checks for both positive cases and fallbacks.
   - On Windows PowerShell 5.1, avoid escaped `\"` inside double-quoted `node -e "..."` strings (use `\x22` or regex literals), convert cross-realm arrays from `vm.runInNewContext` with `Array.from(...)` before `assert.deepStrictEqual`, and verify ZIP changes by extracting a sample archive with `Expand-Archive`.
5. Run the Next.js production build and confirm zero compilation/type/route errors (Note: on Windows PowerShell 5.1, chain commands with `; if ($LASTEXITCODE -eq 0) { ... }` instead of `&&`):
   ```powershell
   npm run build
   ```
6. Scan `app/`, `components/`, and `lib/` to ensure zero hardcoded admin PINs (`336699`, `NEXT_PUBLIC_ADMIN_PIN`, `x-admin-pin`) or PII fields exist in client code or public `courses` payloads.

## 2. Four-Aspect Quality Review

Before committing, explicitly verify these 4 aspects in the changed files:
1. **Bugs / Logic Errors**: Confirm edge cases, zero React Hooks after early returns (`check-hooks.cjs`), dialog `useRef` locks reset cleanly (`finally` + open/close), `!c.isHistorical` / live course titles stay intact, and Next.js App Router `app/api/**/route.ts` files export only HTTP handlers/route configs (never non-handler helper functions).
2. **Error Handling**: Confirm offline/Cloud fallback handling, null/empty guards, and user-facing notices.
3. **Performance & Security**: Confirm `useMemo`/cleanup on effects, raster images pass through `compressImageFile`, `fetchApplicationsFromSupabase` avoids bulk `data_url` selects, lookup endpoints require phone verification + rate limits, no `NEXT_PUBLIC_` secrets, and no exposed 13-digit ID cards or PII on public views/printouts.
4. **Client-Server Data Integrity**: Confirm Cloud sync uses `hasLoadedFromCloud` (plus `mounted && cloudLoaded` loading guards on dynamic/receipt/print views to prevent F5 false not-found flashes) / granular sync, never overwrites admin-edited Supabase records with hardcoded defaults, `await`s Cloud uploads before redirect, and obeys safe-replace ordering (verify new file in DB before deleting old DB/Storage artifacts).
   - Any endpoint deleting from `sat-documents` MUST guard deletions with `removeUnreferencedStorageObjects` so shared reused documents across courses remain intact.
   - Archived Google Drive documents (`isArchivedDocument`) must never be overwritten by stale `localStorage` caches or re-uploaded via `backfillDocumentToSupabase`.
   - Isolated `/admin/workflow` modules must remain Read-only toward core tables, preserve backward compatibility for existing saved fiscal years, enforce `isSafeWorkflowStoragePath` / `isSafeWorkflowAttachmentUrl`, and clean up orphaned files in `_private/workflow-files/`.

## 3. Safe Git Commit & Push on Windows

1. Inspect the working tree first:
   ```powershell
   git status --short
   ```
2. Stage **only** the modified or newly created source files explicitly by path. Never run `git add .` when untracked local reference files (such as desktop `.xlsx` files) exist in the workspace.
3. Commit with a clear message and push to `origin main`. On Windows, try commands in the standard sandbox first; if `.git/index.lock` permission denied or host resolution fails due to sandbox isolation, retry that exact Git command with sandbox bypass using the same operational summary.
4. Confirm the final pushed commit hash (`git push origin main`) and report only directly observed file paths, symbols, command outputs, and test scope.
