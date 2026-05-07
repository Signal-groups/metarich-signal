# CRM Work Status

Last confirmed: 2026-05-05

## Current Direction

- Insurance Manager remains the only login entry.
- Customer management opens from Insurance Manager as `/crm`.
- The old static preview at `public/customer-crm/index.html` is not the active CRM connection.
- CRM should open in a new window from dashboard/sidebar so the main dashboard stays available.
- If CRM redirects to login, login uses `redirectTo=/crm` and returns to CRM after authentication.

## Active CRM Routes

- `/crm` - CRM dashboard
- `/crm/customers` - customer list
- `/crm/customers/new` - customer registration
- `/crm/customers/[id]` - customer detail
- `/crm/family` - family management
- `/crm/upload` - upload analysis and local PC file management
- `/crm/analysis` - coverage analysis
- `/crm/alerts` - notification management
- `/crm/dm` - DM message generation
- `/crm/reports` - PDF/print report generation
- `/crm/settings` - CRM settings

## Important Current Behaviors

- Dashboard customer management buttons point to `/crm`.
- Sidebar customer management opens `/crm` in a new window.
- CRM close button attempts to close the CRM window.
- If the CRM window cannot close itself, it falls back to `/dashboard?mode=office`.
- `/dashboard?mode=office` opens directly into office work instead of the initial office/customer selection screen.
- CRM access uses the same role helpers as dashboard:
  - `normalizeRole`
  - `isApprovedUser`
- Master, headquarters, approved users, and users with `crm_access` can enter CRM.

## Upload Handling

- PC file upload is supported in `/crm/upload`.
- Files are stored locally in the browser using IndexedDB through `lib/crmLocalFiles.ts`.
- File metadata is stored in browser localStorage under `signal-crm-upload-files`.
- This avoids Supabase storage usage for large files.
- Uploaded materials can be linked to a customer.
- Upload categories include:
  - 암
  - 뇌
  - 심장
  - 수술
  - 간병
  - 재가
  - 치매
- Each uploaded item can store:
  - customer link
  - category
  - status
  - memo
  - Google Drive URL
  - report inclusion toggle

## Reports

- `/crm/reports` loads actual customers from Supabase.
- PDF download exists through `jsPDF`.
- Korean-safe reports are handled through `한글 리포트 열기`, which opens a print-friendly report window.
- Linked uploaded images can appear in the Korean print report.
- Full Korean PDF download still needs a Korean font asset such as Noto Sans KR if it should work directly through jsPDF.

## Settings

- `/crm/settings` supports:
  - profile display/update
  - notification toggles stored locally
  - storage guidance
  - page size preference stored locally

## Verification Notes

- `npx tsc --noEmit --pretty false` passed after the CRM additions.
- `npm run build` compiled successfully but stopped at the final TypeScript worker phase with Windows `spawn EPERM`, which appears to be an environment permission issue seen repeatedly in this workspace.

## Next Recommended Improvements

- Add a connected materials section to customer detail pages.
- Store upload metadata in Supabase while keeping actual files in Google Drive or local browser storage.
- Add Noto Sans KR font support for direct Korean PDF generation.
- Add a Drive-link picker or a structured Drive URL field per material.
- Add report templates for cancer, brain, heart, surgery, nursing, home care, and dementia consultation packs.
