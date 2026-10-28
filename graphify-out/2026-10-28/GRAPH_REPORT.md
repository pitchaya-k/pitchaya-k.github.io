# Graph Report - pitchaya-k.github.io-main  (2026-10-22)

## Corpus Check
- Large corpus: 140 files · ~6,094,634 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 886 nodes · 2343 edges · 60 communities (43 shown, 17 thin omitted)
- Extraction: 76% EXTRACTED · 24% INFERRED · 0% AMBIGUOUS · INFERRED: 563 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Minified Vendor Lib A
- Agenda Registry
- Attachments & Docx Export
- Roles & Notifications
- Junction Bridge A7
- Minified Vendor Lib B
- Minified Vendor Lib C
- html2pdf Bundle
- Dashboard Analytics
- Header Suggestions & PDF
- Minified Vendor Lib D
- Report Export
- Case Flow Stepper
- Saraban Numbering
- Seed Deputy Cases
- Dashboard Charts
- Case Reference Helpers
- Seed Scenario Cases
- Case Summary Card
- Voice & Signature Input
- Dashboard Export
- Resolution Split
- Case Data Cache
- Combobox Widgets
- Board Resolution Sync
- Secgen Rules Tests
- Case Summary Mock Page
- Minified Vendor Lib E
- Case Closure
- Deputy Rules Tests
- Backfill Agenda Links
- E-CMIS Model Store
- Resolution Rules Tests
- Case Status Transitions
- M38 Reports
- Minified Vendor Lib F
- SLA Badges
- Prototype Fill
- Accessibility Prefs
- Parallel Pipeline Runner
- Business Day Utils
- Float Toast
- Track Status 72
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57

## God Nodes (most connected - your core abstractions)
1. `e()` - 132 edges
2. `h()` - 113 edges
3. `Qe()` - 49 edges
4. `t()` - 46 edges
5. `o()` - 41 edges
6. `s()` - 36 edges
7. `renderShell()` - 34 edges
8. `n()` - 32 edges
9. `i()` - 30 edges
10. `o()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `h()` --indirect_call--> `K()`  [INFERRED]
  assets/html2pdf.bundle.min.js → tests/resolution-rules.test.mjs
- `h()` --indirect_call--> `J()`  [INFERRED]
  assets/html2pdf.bundle.min.js → assets/junction-bridge-a7.js

## Import Cycles
- None detected.

## Communities (60 total, 17 thin omitted)

### Community 0 - "Minified Vendor Lib A"
Cohesion: 0.10
Nodes (51): e(), at(), br(), bt(), cr(), ct(), dr(), dt() (+43 more)

### Community 1 - "Agenda Registry"
Cohesion: 0.08
Nodes (41): addItem(), addMeeting(), agendaLookupFromCase(), boardMeetings(), boardMeetingView(), caseChip(), combinedCaseRef(), deleteItem() (+33 more)

### Community 2 - "Attachments & Docx Export"
Cohesion: 0.07
Nodes (47): attachBadge(), attachExt(), attachSize(), attachStageOf(), attachWhen(), confirmAction(), exportDocToDocx(), initAttachmentCard() (+39 more)

### Community 3 - "Roles & Notifications"
Cohesion: 0.09
Nodes (40): applyDeadlineNotifRefresh(), applyNotifReadToItem(), buildDeadlineNotifItems(), can(), canAccessPage(), canEditMaster(), canViewCase(), currentRole() (+32 more)

### Community 5 - "Junction Bridge A7"
Cohesion: 0.17
Nodes (35): applyLinkedCase(), baseResult(), choose(), disciplineFollowUp(), ecmis(), emptyReportResult(), emptyReportWorkflow(), importPending() (+27 more)

### Community 6 - "Minified Vendor Lib B"
Cohesion: 0.19
Nodes (33): a(), C(), a(), c(), E(), er(), ht(), i() (+25 more)

### Community 7 - "Minified Vendor Lib C"
Cohesion: 0.13
Nodes (32): be(), Ce(), De(), Dr(), ar(), de(), ee(), fe() (+24 more)

### Community 8 - "html2pdf Bundle"
Cohesion: 0.07
Nodes (15): Cr(), ae(), ve(), z(), Er(), He(), Ht(), Je() (+7 more)

### Community 9 - "Dashboard Analytics"
Cohesion: 0.13
Nodes (23): activeDb(), calculateMonthCategoryTotals(), classifyRequest(), emptyCategories(), exportToCSV(), fetchDashboardData(), fetchLive(), fiscalYearOfKey() (+15 more)

### Community 10 - "Header Suggestions & PDF"
Cohesion: 0.13
Nodes (26): caseLineOf(), escapeHtml(), exportDocToPdf(), generalType73(), getSuggestionsData(), initAutoSave(), initCharCounterAndCopy(), initHeaderSuggestionsButton() (+18 more)

### Community 11 - "Minified Vendor Lib D"
Cohesion: 0.19
Nodes (27): B(), b(), be(), ge(), gr(), h(), j(), je() (+19 more)

### Community 12 - "Report Export"
Cohesion: 0.18
Nodes (24): buildDocxBlob(), buildPdfBlob(), buildXlsxBlob(), cell(), doExport(), download(), ensureHtml2pdf(), esc() (+16 more)

### Community 13 - "Case Flow Stepper"
Cohesion: 0.09
Nodes (24): actionBar(), annotateStepperDates(), canAct(), caseFlowSteps(), caseRouteChainHtml(), caseStepActorIds(), caseStepInfo(), caseStepperHtml() (+16 more)

### Community 14 - "Saraban Numbering"
Cohesion: 0.23
Nodes (19): actor(), currentYearBE(), ensureStyle(), escRe(), formatSarabanNo(), issueSarabanNo(), loadRows(), mountSarabanField() (+11 more)

### Community 15 - "Seed Deputy Cases"
Cohesion: 0.10
Nodes (10): appJs, APPLY, body, DEPUTY_KEYS, H, here, hi, RESET (+2 more)

### Community 16 - "Dashboard Charts"
Cohesion: 0.31
Nodes (16): beforeDraw(), createBarTooltipConfig(), createDonutTooltipConfig(), destroyChart(), exportChartImage(), formatNumber(), formatPercentage(), getChart() (+8 more)

### Community 17 - "Case Reference Helpers"
Cohesion: 0.13
Nodes (18): caseByRef(), caseNo(), caseNoListHtml(), caseRefText(), caseSearchText(), dash(), daysUntilFakeIso(), fakeTodayIso() (+10 more)

### Community 18 - "Seed Scenario Cases"
Cohesion: 0.12
Nodes (9): appJs, APPLY, H, here, hi, RESET, rows, sb() (+1 more)

### Community 19 - "Case Summary Card"
Cohesion: 0.26
Nodes (15): accusedResultText(), caseSource(), caseTypeChip(), deadlineFields(), findingsHtml(), html(), intakeChannelText(), lineOf() (+7 more)

### Community 20 - "Voice & Signature Input"
Cohesion: 0.15
Nodes (16): cleanupVoice(), clear(), getDataUrl(), init(), stop(), initSignaturePad(), initVoiceInput(), syncVoiceBtnState() (+8 more)

### Community 21 - "Dashboard Export"
Cohesion: 0.28
Nodes (13): attachChipEvents(), createDrilldownModalElement(), escapeHtml(), exportModalTableToExcel(), exportToExcel(), formatDisplayVal(), formatNumber(), injectPrintStyles() (+5 more)

### Community 22 - "Resolution Split"
Cohesion: 0.30
Nodes (13): acceptText(), create(), apply(), baseCode(), canSplit(), effectiveCode(), isSplit(), lawOptions() (+5 more)

### Community 23 - "Case Data Cache"
Cohesion: 0.18
Nodes (14): addDaysToDateStr(), addYearsToDateStr(), autoMountAttachmentCard(), buildChainOpinions(), cacheLiveCases(), chainStepsDone(), fetchCasesByNos(), getCase() (+6 more)

### Community 24 - "Combobox Widgets"
Cohesion: 0.27
Nodes (13): initMultiSelectCombo(), closeDropdown(), commit(), openDropdown(), renderItems(), renderToggle(), initSmartCombobox(), getOptions() (+5 more)

### Community 25 - "Board Resolution Sync"
Cohesion: 0.14
Nodes (12): args, copyDirRecursive(), DEFAULT_SOURCE, DEST_DIR, destAssetsDir, destHtmlFiles, __dirname, __filename (+4 more)

### Community 26 - "Secgen Rules Tests"
Cohesion: 0.14
Nodes (11): aligned, alignedCase, diverged, divergedCase, forward, here, nacc, r644 (+3 more)

### Community 27 - "Case Summary Mock Page"
Cohesion: 0.26
Nodes (11): init(), linkBtn(), mockSecgenRoute(), mountOpinionCard(), render(), update(), noComplexLabel(), opinionCardHtml() (+3 more)

### Community 28 - "Minified Vendor Lib E"
Cohesion: 0.33
Nodes (13): d(), ce(), f(), g(), l(), m(), w(), l() (+5 more)

### Community 29 - "Case Closure"
Cohesion: 0.30
Nodes (8): applies(), applies73(), mount(), mount73(), go(), reload(), view(), resCode()

### Community 30 - "Deputy Rules Tests"
Cohesion: 0.17
Nodes (8): chain, dep, deputy, here, noOpinion, source, window, withOpinion

### Community 31 - "Backfill Agenda Links"
Cohesion: 0.20
Nodes (7): appJs, APPLY, here, lastReset, PRE_AGENDA, trrIds, w

### Community 33 - "Resolution Rules Tests"
Cohesion: 0.22
Nodes (3): here, K(), window

### Community 34 - "Case Status Transitions"
Cohesion: 0.25
Nodes (8): applyLiveCase(), canTransition(), logRequestEvent(), logRequestEventNow(), saveCases(), trackSave(), transitionsBetween(), updateCaseStatus()

### Community 35 - "M38 Reports"
Cohesion: 0.32
Nodes (8): m38Act(), m38Get(), m38Load(), m38PendingCount(), m38Reports(), m38Reset(), m38Save(), m38VisibleFor()

### Community 36 - "Minified Vendor Lib F"
Cohesion: 0.36
Nodes (8): hr(), pr(), ye(), H(), I(), L(), P(), T()

### Community 37 - "SLA Badges"
Cohesion: 0.29
Nodes (7): effectiveSlaLimit(), fakeSlaUsed(), secgenSlaLimit(), slaBadge(), slaClass(), slaLabel(), slaUsedLimit()

### Community 38 - "Prototype Fill"
Cohesion: 0.60
Nodes (5): apply(), channelFor(), meetingResolutionFor(), offensesFor(), ownerOpinionFor()

### Community 39 - "Accessibility Prefs"
Cohesion: 0.40
Nodes (6): applyColorMode(), changeFont(), fontBaseSize(), initA11yAndPref(), syncFontButtons(), toggleColorMode()

### Community 41 - "Business Day Utils"
Cohesion: 0.50
Nodes (5): addBusinessDays(), businessDaysBetween(), isWeekend(), parseIsoToDate(), resolutionSlaInfo()

### Community 42 - "Float Toast"
Cohesion: 0.70
Nodes (5): hideFloatToast(), renderFloatToast(), resumeFloatToast(), saveFloatToast(), showFloatToast()

### Community 43 - "Track Status 72"
Cohesion: 0.83
Nodes (4): bothTracksDone72(), hasCriminalTrack72(), hasDisciplineTrack72(), trackStatus72()

### Community 44 - "Community 44"
Cohesion: 0.50
Nodes (4): initRichTextBox(), plainTextToHtml(), sanitizeRichPaste(), walk()

### Community 45 - "Community 45"
Cohesion: 0.50
Nodes (4): isScreeningLocked(), mapSubOutcome(), slaIsOnHold(), subScreeningStatus()

## Knowledge Gaps
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `h()` connect `Minified Vendor Lib A` to `Resolution Rules Tests`, `Minified Vendor Lib F`, `Junction Bridge A7`, `Minified Vendor Lib B`, `Minified Vendor Lib C`, `html2pdf Bundle`, `Minified Vendor Lib D`, `Minified Vendor Lib E`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Are the 39 inferred relationships involving `e()` (e.g. with `html2pdf.bundle.min.js` and `Dr()`) actually correct?**
  _`e()` has 39 INFERRED edges - model-reasoned connections that need verification._
- **Should `Minified Vendor Lib A` be split into smaller, more focused modules?**
  _Cohesion score 0.09503843466107617 - nodes in this community are weakly interconnected._
- **Why does `v()` connect `Minified Vendor Lib D` to `Minified Vendor Lib A`, `Minified Vendor Lib C`, `html2pdf Bundle`, `Seed Deputy Cases`, `Seed Scenario Cases`, `Minified Vendor Lib E`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Are the 35 inferred relationships involving `h()` (e.g. with `br()` and `bt()`) actually correct?**
  _`h()` has 35 INFERRED edges - model-reasoned connections that need verification._
- **Should `Agenda Registry` be split into smaller, more focused modules?**
  _Cohesion score 0.08235294117647059 - nodes in this community are weakly interconnected._
- **Why does `e()` connect `Minified Vendor Lib A` to `Minified Vendor Lib F`, `Minified Vendor Lib B`, `Minified Vendor Lib C`, `html2pdf Bundle`, `Minified Vendor Lib D`, `Minified Vendor Lib E`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._