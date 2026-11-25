# Plan: Supabase → localStorage + schema of fields in use

Scanned: root `*.html` and `assets/*.js`. Vendor files and `graphify-out` were skipped.

---

## 0. Status: built (2026-11-25)

| What | Where |
|---|---|
| Fake client | `assets/ecmis-localdb.js` |
| Seed data | `assets/localdb-seed.json`. Re-export: `node scripts/export-localdb-seed.mjs` (drops soft-deleted rows, ~1.8M chars) |
| Tests | `node tests/localdb.test.mjs` (16 cases) |
| Script tag | after `vendor/supabase/supabase.js`, or before `ecmis-app.js` / `overall-flow.js`: 170 pages in 3 folders |
| Bypass fixes | `ecmis-app.js` sync `getCase` lookup + attachment upload, `overall-flow.js` live status/reset |

URL switches (remembered per browser): `?db=local` (default) · `?db=supabase` (real DB again) · `?db=reset` (wipe + re-seed).
Console: `ECMISLocalDB.reset()`, `ECMISLocalDB.rows('tbl_res_request')`, `ECMISLocalDB.exportJson()`.
All pages share one origin, so they share one local DB, same as they shared one Supabase.

## 1. Plan

### Idea
Every page gets its client from `ECMIS.getSupabaseClient()` (`assets/ecmis-app.js:4169`). Make that function return a **fake client** with the same API that reads and writes browser storage. Page code stays the same.

### New file `assets/ecmis-localdb.js`
Covers only the query API the code really uses (counted from a grep):

| Method | Count | Note |
|---|---|---|
| `.from(t).select(str)` | 75 | must parse embeds: `tbl_cmp_case!inner(*, tbl_cmp_case_accused(*))`. `!inner` = drop rows with no match |
| `.eq` / `.in` / `.match` | 154 / 10 / 34 | |
| `.filter('trr_resolution_data->>key', ...)` | 1 | JSON path `->>` |
| `.order` / `.limit` / `.range` | 7 / 5 / 1 | |
| `.single` / `.maybeSingle` | 2 / 35 | |
| `.update` / `.insert` / `.delete` | 84 / 9 / 7 | `.select()` after a write returns the rows |
| `.upsert(.., {onConflict:'tcca_id,trob_id', ignoreDuplicates})` | 1 | |
| `.rpc('ecmis_record_notification_read', {p_notification_id,p_user_id})` | 1 | upsert into read_receipt, return `read_at` |
| `sb.storage.from('case-documents').upload(path,file)` | few | file → IndexedDB, not localStorage (5MB limit) |

Return shape: `{ data, error }`, same as supabase-js. Joins go by FK name: `tcc_id`, `trr_id`, `trci_id`, `trc_id`, `trob_id`, `tcca_id`.

### Storage layout
- `localStorage['ecmis.db.v1.<table>']` = JSON array of rows
- `localStorage['ecmis.db.v1.__seq']` = `{ table: lastId }` for auto ids
- `localStorage['ecmis.db.v1.__version']`: if it doesn't match, re-seed
- Files go in IndexedDB `ecmis-files`, key = `trat_storage_path`
- `public_case_status_view` is a function computed from `tbl_res_request` + `tbl_cmp_case`, not stored

### Steps
1. **Seed export**: a node script (`scripts/export-localdb-seed.mjs`) reads every table once from Supabase and writes `assets/localdb-seed.json`. On first load the fake client copies the seed into localStorage.
2. **Build `ecmis-localdb.js`** with the API above. Unit-test it against sample queries taken from the code (the `!inner` embed, `maybeSingle`, upsert conflict).
3. **Swap the client**: `getSupabaseClient()` returns the local client by default. `?db=supabase` or `localStorage['ecmis.db.mode']='supabase'` gives the old Supabase client back, for debugging.
4. **Fix the bypass spots** that talk to Supabase directly:
   - `assets/ecmis-app.js:3813`: raw `fetch(/rest/v1/tbl_res_request?...)` → local query
   - `agenda.html:216`, `agenda-set.html:216`, `approval-review.html:296`, `assets/agenda-registry-data.js:20`, `assets/dashboard-analytics-service.js:29`: each falls back to `supabase.createClient` itself. Point them at the local client
   - `index.html:1700`: `trackSb` public status lookup
   - `ensureNotificationSupabase()` (notification read receipts)
5. **Load order**: add `<script src="assets/ecmis-localdb.js">` before `ecmis-app.js` on every page. A script can patch all 3 folders (root, A, B).
6. **Cross-tab sync**: listen for the `storage` event and re-run the page refresh hooks, so two tabs (e.g. owner and secgen) see each other's changes.
7. **Reset button**: a dev menu item "ล้างข้อมูลจำลอง" that clears the `ecmis.db.v1.*` keys and re-seeds.
8. **Verify**: run the existing tests (`tests/*.test.mjs`) and the Playwright flows on each main flow (7.1, 7.2, 7.3, agenda, ruling).

### Risks
- **5MB quota**: `trr_recorded_doc_html` and `trr_resolution_data` can get big. Keep files in IndexedDB. If the quota is hit, move all tables to IndexedDB too (same API, async).
- **Per-browser data**: users on different machines won't share data. Fine for a demo; a shared multi-user demo needs Supabase.
- **Existing sessionStorage**: `ecmis_cases` (the in-memory CASES cache, `ecmis-app.js:3253`) stays as is. It's a separate layer.
- **Seed scripts** (`scripts/seed-*.mjs`) write to Supabase. Either point them at the seed JSON or run them first and then export.

---

## 2. Schema: fields the code uses

Built from the field names that appear in the code, not from the database itself. `?` = seen only a few times, may be page-only state with no real column (the `agenda-registry-data.js:491` comment says invite details have no column yet).

### `tbl_cmp_case`: the case
| Column | Use |
|---|---|
| `tcc_id` | PK |
| `tcc_no` | case no. (`kase.id`), join key for lookups |
| `tcc_subject`, `tcc_allegation`, `tcc_legal_base`, `tcc_complainant` | text |
| `tcc_owner`, `tcc_owner_org` | owner |
| `tcc_received_date`, `tcc_prescription_date` | date (CE in DB, shown as BE) |
| `tcc_doc_ref` | |
| `tcc_doc_type` | `213` / `644` / `RULING` (DB check constraint) |
| `tcc_complex`, `tcc_urgent` | bool |
| `is_deleted` | bool |

### `tbl_cmp_case_accused`: accused people (child of case)
`tcca_id` PK · `tcc_id` FK · `tcca_no` (sort order) · `tcca_name` · `tcca_position` · `tcca_idcard` · `tcca_agency` · `is_deleted`

### `tbl_res_request`: the resolution request (main workflow row, 266 `.from` calls)
| Column | Use |
|---|---|
| `trr_id` | PK |
| `tcc_id` | FK → case |
| `trr_status` | CHAR(3) code (`STATUS_CODE`/`CODE_STATUS`). Source of truth for status |
| `trr_module` | |
| `trr_sla_days`, `trr_sla_limit` | int |
| `trr_urgent`, `trr_signed_secgen` | bool |
| `trr_sub_committee` | text ("คณะที่ N") |
| `trr_resolution_stage` | int (e.g. 6 after meeting report) |
| `trr_recorded_doc_html` | big HTML |
| `trr_meeting_no`, `trr_agenda_no`, `trr_meeting_date` | |
| `trr_subcmt_meeting_date`, `trr_subcmt_resolved_date`, `trr_subcmt_sent_board_date` | ? |
| `trr_resolution_data` | **JSONB**, see below |
| `is_deleted` | bool |

#### `trr_resolution_data` JSON keys (from the write/patch sites)
It gets spread straight onto `kase`, so every key below shows up as `kase.<key>`.

- **Route / type**: `procType` (7.1/7.2/7.3) · `docType` · `generalType` · `lineSwitch` · `caseOrigin`
- **Resolution**: `code` (RESOLUTIONS code) · `previousResolution` · `otherResolutionText` · `forwardTo` · `forwardToOther` · `offenseBasis` · `criminalSections` · `resolvedAtIso`
- **Board / meeting**: `boardOpinion` · `boardVotes` · `boardAttendance` · `meetingNo` · `meetingDate` · `agendaNo` · `agendaTitle` · `agendaDetails` · `meetingReportDone` · `meetingReportAt` · `reagendaPending` · `reagendaReason` · `staleAgendaLinks`
- **Order ม.24**: `order24Members` · `order24AccusedText` · `order24FactSummary` · `order24OffenseBasis` · `orderNo` · `orderDate` · `orderMode`
- **Ruling**: `signedRulingAt` · `signedRulingFile` · `signedRulingMethod` · `chairNoteRuling` · `factSummary72` · `accusedSnapshot`
- **Return / approval**: `chairmanReturnReason` · `chairmanReturnReason72` · `deputyReturn` · `sourceReturn` · `dirCaseApproval` · `actorRoleId`
- **Complex / urgent**: `complexReason` · `complexMemoBy` · `complexMemoAtIso` · `urgentReason`
- **Support sub-committee**: `supportTeam` · `supportSubTeam` · `supportControlSeq` · `supportControlYear` (queried via `->>`) · `chairAssign73`
- **Other**: `additionalInquiry` · `eofficeDocId`
- **Doc numbers**: `sarabanNos` (array/obj; nested keys `prefix`, `no`, `group`, `label`, `state`, `trace`)
- Also stored but overwritten on read: `status` (stale; `trr_status` wins)

> The key list comes from a regex scan of patch objects, so it may miss a few keys built dynamically.

### `tbl_res_request_event`: audit log
`trr_id` · `trre_type` (default `STATUS_CHANGE`, also `RETURN_NOTICE`...) · `trre_from_status` · `trre_to_status` (CHAR(3)) · `trre_actor_role` · `trre_note` · `trre_data` (JSON) · `created_datetime`

### `tbl_res_attachment`: files
`trat_id` PK · `tcc_id` FK · `trat_filename` · `trat_storage_path` (bucket `case-documents`, `<tcc_id>/<ts>_<name>`) · `trat_mime_type` · `trat_size_bytes` · `trat_uploaded_by_role` · `is_deleted` (soft delete)

### `tbl_res_calendar`: board meeting
`trc_id` PK · `trc_name` · `trc_date` · `trc_status` · `trc_start_time` · `trc_end_time` · `trc_confirmed` · `created_by` · `created_datetime` · `updated_by` · `updated_datetime` · `is_deleted`
?: `trc_time` · `trc_place` · `trc_secrecy` · `trc_invite_no` · `trc_invite_date` · `trc_signer_name` · `trc_signer_title` · `trc_dept_recipient` · `trc_contact_tel` (invite details, likely page-only)

### `tbl_res_calendar_item`: agenda item
`trci_id` PK · `trc_id` FK · `trci_number` · `trci_topic` · `category` · `remark` (real columns with no prefix) · `trci_presenters` · `is_deleted`
?: `trci_description` · `trci_detail`

### `tbl_res_calendar_item_case`: agenda item ↔ request
`trcic_id` PK · `trci_id` FK · `trr_id` FK · `trcic_remark` · `is_deleted`

### `tbl_res_calendar_item_history`
`trci_id` · `trcih_detail` · `trcih_remark` · `created_by` · `created_datetime`

### `tbl_res_calendar_item_qualifier`: item ↔ qualifier
`trci_id` · FK to `tbl_res_agenda_qualifier` · `is_deleted`

### `tbl_res_agenda_qualifier`: lookup (embedded only)
`trqf_code` · `trqf_group` · `trqf_label` · `trqf_sort_order`

### `tbl_res_offense_basis`: lookup of law articles
`trob_id` PK · `trob_law_name` · `trob_article_no` · `trob_article_label` · `trob_group` · `trob_sort_order` · `is_deleted`

### `tbl_res_accused_offense`: accused ↔ offense (M:N)
`tcca_id` · `trob_id` (unique pair, used for the upsert conflict)

### `ecmis_notification_read_receipt`
`notification_id` · `user_id` · `read_at`. Written only through rpc `ecmis_record_notification_read`.

### `ecmis_app_state`: new, local DB only (2026-11-25)
`state_key` PK · `state_value` (JSON) · `created_datetime` · `updated_datetime`. Read/written via `ECMISAppState.get/set`.
Holds data that used to sit in loose browser keys: `ecmis.meetingBoardRosters.v1` (rosters per meeting), `ecmis.lockedBoardRoster`,
`ecmis.boardAttendanceLastByMeeting.v1`, `ecmis_board_note_trci_<id>` (board notes), `ecmis_m38_reports_v1` (ม.38 reports).
Old values move in automatically the first time they're read. With `?db=supabase` it falls back to the old browser keys (Supabase has no such table).

### Meeting invite details: now saved
`tbl_res_calendar` gets `trc_invite_no` · `trc_invite_date` · `trc_time` · `trc_place` · `trc_contact_tel` · `trc_dept_recipient` · `trc_secrecy` · `trc_signer_name` · `trc_signer_title`.
Setters on the meeting objects in `assets/agenda-registry-data.js` save edits (600ms debounce, and again on page leave). On real Supabase these columns don't exist yet, so the save logs an error and changes nothing.

### Still outside the DB
- `ecmis-a7-junction-cases-v1`: shared with other activities through the same browser key. Left alone so they keep working.
- `trci_detail` / `trci_description`: read by pages, but no page writes them.
- Mock `CASES` fields (`procType`, `resolution`, `order24*`…) and `M28_LOG`: still in code/sessionStorage.

### `public_case_status_view`: view (public tracking on `index.html`)
`tracking_no` · `status_label` · `step_received` · `step_preliminary` · `step_assigned` · `step_ruling`
