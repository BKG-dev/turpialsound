---
tags: ["#central", "#methodology", "#optimization", "#status/live-source"]
fecha: 2026-05-12
metodologia: Oreshnik + Bus de Control Nivel 2.5
---

# METODOLOGÍA ORESHNIK + BUS DE CONTROL — ANÁLISIS Y OPTIMIZACIÓN

## Section 1: Current Model Assessment

### 1.1 What Works Well

**Lock-per-domain system.** The 9-layer lock matrix (`BUS_CONTROL_TURPIAL.md:101-114`) is the strongest mechanism in the methodology. Double-lock for DB/schema, owner-exclusive for booking, Jean-gate for production — this prevents catastrophic collisions with zero ambiguity about who can touch what.

**QA dispatcher as canonical source of truth.** `qa-dispatcher.json` defines exact script paths, preconditions, allowed fallbacks, and forbidden methods. This eliminates the "which QA script should I run?" ambiguity that plagued earlier phases. The architecture's A-B-C-D layering (preflight → server-side → browser smoke → E2E) provides proportional validation.

**Checklist-driven push gating.** The 9-item checklist before pushing to mother (`BUS_CONTROL_TURPIAL.md:90-99`) enforces discipline: no secrets, no cross-sprint contamination, no production deployment. The integration gatekeeper adds `LISTA_PARA_REVIEW`/`LISTA_PARA_MERGE` state machine.

**Sprint reasignación rules.** The 6-rule protocol for operator unavailability (`BUS_CONTROL_TURPIAL.md:134-143`) handles real-world scheduling conflicts cleanly. Branch renaming, notification in CENTRAL_TURPIAL, and documented handoff prevent orphaned work.

**Multi-worktree isolation.** The project uses physical git worktrees (8 visible on disk) so agents never share the same working directory. This eliminates file-locking issues at the OS level.

**Clear role boundaries.** Jean owns production/billing/booking. Manuel owns QA/UX/marketplace product. Neither can cross without explicit lock.

### 1.2 What Creates Friction

**Manual pre-flight is a human bottleneck.** The AGENT_CONTROL_BUS_RUNNER Step 1 (Preflight) requires the agent to read 6 large documents, verify 4 guardrail categories, check base branch existence, and validate working tree cleanliness — every single time. This is ~5 minutes of context-loading before any productive work begins. The `bootstrap-marketplace-qa.mjs --doctor` script referenced in PLAN_MAESTRO does not exist on disk.

**Oreshnik orchestrator is design-only.** `ORESHNIK_ORCHESTRATOR_DESIGN.md` describes `scripts/oreshnik/` with prompts, logs, runs subdirectories, and `oreshnik.ps1` runner — none of which exist. The `scripts/oreshnik/` directory is empty. The entire init → validate → execute → log → checkpoint automation is vaporware.

**Stale worktrees from closed sprints.** Six of eight worktrees correspond to S01/S03 sub-sprints that were closed and merged weeks ago. These consume disk space and create confusion about what's "active."

**Missing scripts in the canonical dispatcher.** Three task_ids in `qa-dispatcher.json` are annotated `MISSING on disk — GAP OPERATIVO`: `admin_local_smoke`, `buyer_only_short`, `reconcile_read_only`. These are referenced by the sprints but the scripts don't exist. The dispatcher notes say "replace with QA-07, QA-05/06, QA-10" — but the mappings are inconsistent between the legacy entries and their replacements.

**Documentation duplication and drift.** The same information lives in at least 5 places: `BUS_CONTROL_TURPIAL.md`, `AGENT_CONTROL_BUS_RUNNER.md`, `SPRINTS_CODEV_MARKETPLACE_2026-05-10.md`, `PLAN_MAESTRO_SPRINTS_2026-05-12.md`, and `00_CENTRAL_TURPIAL.md`. Locks, roles, checkpoint rules, and sprint definitions are repeated across all. When one updates, the others lag. Example: `BUS_CONTROL_TURPIAL.md` references `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07` as mother branch, but `00_CENTRAL_TURPIAL.md` references `integration/today-reservas-marketplace-stable-2026-05-07` — two different mother branch names for the same code.

**Closure report overhead.** Every sprint closure requires manually updating `session-summary-active.md`, `next-window-brief.md`, `ROADMAP_RESCATE.md`, optionally `BUGS_CRITICOS.md`, and writing a structured report. This is pure overhead — the git log already contains commits, files touched, and author. The report template could be auto-generated.

**Context bloat.** The AGENT_CONTROL_BUS_RUNNER instructs agents to read 6 full documents before any action. `PLAN_MAESTRO_SPRINTS_2026-05-12.md` is 964 lines. An agent executing S12 doesn't need 800 lines about Booking, Crecimiento, Admin-Legal, and UI tracks. Most of the context is irrelevant per sprint.

**No pre-commit or pre-push automation.** The `.husky/` directory does not exist. There are zero git hooks. The 9-item push checklist is entirely manual — an agent can forget to verify `.env` exclusions, skip QA, or push to production with no automated guard.

**No conflict detection.** Anti-colisión rules say "don't work on the same file" but there's no machine-readable zone map. Two agents starting S12 and S-JB-01 in parallel have to manually verify they won't collide — relying on human memory of which files belong to which domain.

**No notification or dashboard automation.** When a sprint closes, nothing updates automatically. `00_CENTRAL_TURPIAL.md` and `PLAN_MAESTRO_SPRINTS_2026-05-12.md` must be manually edited. The other operator has to check these files to know what changed.

### 1.3 Identified Gaps

| Gap | Impact | Severity |
|-----|--------|----------|
| No automated pre-flight validation | Agents waste time re-verifying manually; missing env vars are discovered mid-sprint | High |
| Oreshnik orchestrator not built | No automated checkpointing, no run manifests, no halt capability | High |
| No file-to-sprint zone map | Collision detection is fully manual and error-prone | High |
| Mother branch name drift between docs | Ambiguity about which branch is canonical mother | Medium |
| Stale worktrees not auto-cleaned | Disk waste, confusion about active work | Medium |
| Three QA task_ids are GAP OPERATIVO with conflicting replacement mappings | An agent encountering one of these mid-sprint will dead-stop | Medium |
| No automated sprint scaffolding | Each sprint requires manual branch creation + template copy + env bootstrap | Medium |
| No Vercel preview auto-deploy per sprint branch | Visual validation requires manual deploy or running app locally | Medium |
| Closure reports are fully manual | ~10 minutes of documentation per sprint that could be automated | Low |
| No parallel console safety matrix | Operators cannot quickly assess whether two sprints are safe to run simultaneously | Low |

---

## Section 2: Specific Optimizations

### 2.1 Pre-flight Automation

**What:** Auto-run the doctor/bootstrap scripts as git pre-commit and pre-push hooks instead of requiring manual invocation at the start of each sprint.

**Why:** The current model requires the agent or operator to manually run:
```
powershell -ExecutionPolicy Bypass -File scripts/qa/ensure-marketplace-qa-env.ps1
npx tsx scripts/qa/doctor-marketplace-qa-env.mjs
```
every time they start a new sprint. These scripts validate that DATABASE_URL, QA credentials, APP_URL exist and are reachable. If missing, the sprint fails mid-execution rather than before it starts. Automating this as a pre-commit hook means no commit leaves the machine without validated environment.

**How to implement:**
1. Create `.husky/pre-commit` (install `husky` or use a plain `.git/hooks/pre-commit`):
   ```bash
   #!/bin/bash
   # Turpial pre-flight: validate env vars before commit
   node scripts/qa/doctor-marketplace-qa-env.mjs || {
     echo "Pre-flight failed. Run: powershell -File scripts/qa/ensure-marketplace-qa-env.ps1"
     exit 1
   }
   ```
2. Create `.husky/pre-push`:
   ```bash
   #!/bin/bash
   # Turpial pre-push: verify no .env, no secrets, no production deploy
   git diff --check origin/$(git rev-parse --abbrev-ref HEAD)..HEAD
   # Check no .env files staged
   if git diff --name-only HEAD | grep -q '\.env'; then
     echo "BLOCKED: .env files in diff. Remove before push."
     exit 1
   fi
   # Check no booking files if on marketplace sprint
   if git diff --name-only HEAD | grep -q '/reservas/'; then
     echo "BLOCKED: /reservas files in diff. Booking zone requires explicit lock."
     exit 1
   fi
   ```
3. Create `scripts/oreshnik/preflight-check.ps1` as a standalone script that runs: doctor env → `pnpm lint` → `npx tsc --noEmit` → reports status.

**Expected impact:** Eliminates ~5 minutes of manual pre-flight per sprint. Catches missing env vars, lint errors, and type errors before commit, not after. Prevents the single most common failure mode: discovering missing DATABASE_URL mid-implementation.

**Risk:** Pre-commit hooks can be bypassed with `--no-verify`. The methodology already prohibits this; the hook is defense-in-depth.

---

### 2.2 Conflict Detection via Zone Map

**What:** A machine-readable JSON file that maps every file and directory in the project to the sprint(s) and track(s) that can touch it. Before an agent starts work or pushes, a script checks this map to detect if two active branches would collide on the same files.

**Why:** Currently the Bus de Control says "don't work on the same file" but provides zero tooling to check this. With 27 sprints across 5 tracks, manual verification is impractical. Example collision risk: S15 (location filters) touches `components/marketplace/` while S14B (shopping cart) touches `components/marketplace/MarketplaceCard.tsx` — no one knows unless they search every file.

**How to implement:**
1. Create `docs/07_handoffs/zone-map.json`:
   ```json
   {
     "zones": {
       "app/(public)/marketplace/**": {
         "track": "T1",
         "sprints": ["S09", "S15", "S20"],
         "criticality": "normal",
         "lock": "owner_per_sprint"
       },
       "app/(public)/reservas/**": {
         "track": "T2",
         "sprints": ["S-JB-01", "S-JB-02", "S-JB-03", "S-JB-04"],
         "criticality": "critical",
         "lock": "jean_exclusive"
       },
       "prisma/schema.prisma": {
         "track": "any",
         "sprints": [],
         "criticality": "critical",
         "lock": "double_jean_manuel"
       },
       "prisma/migrations/**": {
         "track": "any",
         "sprints": [],
         "criticality": "critical",
         "lock": "double_jean_manuel"
       },
       "components/marketplace/**": {
         "track": "T1",
         "sprints": ["S14B", "S15", "S16", "S17", "S-UX-01", "S-UX-02"],
         "criticality": "normal",
         "lock": "owner_per_sprint"
       },
       "app/api/marketplace/payment-proofs/**": {
         "track": "T1",
         "sprints": ["S04", "S13"],
         "criticality": "critical",
         "lock": "double_jean_manuel"
       },
       "app/api/marketplace/rates/**": {
         "track": "T1",
         "sprints": ["S07"],
         "criticality": "critical",
         "lock": "double_jean_manuel"
       },
       "docs/**": {
         "track": "any",
         "sprints": ["*"],
         "criticality": "low",
         "lock": "light"
       },
       "scripts/qa/**": {
         "track": "any",
         "sprints": ["S03", "S11", "S12", "S18"],
         "criticality": "normal",
         "lock": "owner_per_sprint"
       }
     }
   }
   ```
2. Create `scripts/oreshnik/zone-check.ps1`:
   ```powershell
   # Usage: ./zone-check.ps1 -Sprint S14B
   # Reads zone-map.json, prints "SAFE" or "COLLISION: <file> with <sprint>"
   param([string]$Sprint)
   # 1. Resolve sprint's zones from zone-map.json
   # 2. Git diff of current branch → list files touched
   # 3. Check each touched file against zone-map for conflicting sprints
   # 4. Report collisions
   ```
3. Run as pre-push hook: if the diff touches a zone locked by another active sprint, block the push and report the collision.

**Expected impact:** Eliminates the "we didn't know we touched the same file" failure mode. Enables true parallel work with confidence. Reduces lock-related sprint blockages by detecting conflicts before work begins.

**Effort:** Medium. Writing the zone map is the bulk of the work (~60 zones to catalog). The checker script is ~50 lines of PowerShell.

---

### 2.3 Automated Sprint Scaffolding

**What:** A single PowerShell script `scripts/oreshnik/scaffold-sprint.ps1` that, given a sprint ID and operator name, creates the branch from mother, applies the sprint template, bootstraps `QA_*` env vars, and opens the worktree — all in one command.

**Why:** Currently starting a sprint requires:
1. `git fetch origin`
2. `git checkout -b Manuel/s12-... origin/integration/today-...` 
3. Run `ensure-marketplace-qa-env.ps1` if credentials missing
4. Run `doctor-marketplace-qa-env.mjs` to verify
5. Manually verify the 4 guardrail categories from BUS runner
6. Read 6+ documents for context

This is 6 manual steps that could be one command.

**How to implement:**
```powershell
# scripts/oreshnik/scaffold-sprint.ps1
param(
  [Parameter(Mandatory)] [string]$SprintId,   # e.g., "S12"
  [Parameter(Mandatory)] [string]$Operator,    # "Jean" | "Manuel"
  [string]$BaseBranch = "integration/today-reservas-marketplace-stable-2026-05-07",
  [string]$AppUrl = "https://turpialsound-5qwhe7is1-bkgs-projects-829c67c1.vercel.app"
)

# 1. Validate sprint exists in PLAN_MAESTRO
# 2. Check operator is the owner (or valid fallback)
# 3. Verify no active worktree for this sprint
# 4. Verify mother branch exists: git fetch origin
# 5. Create branch: git checkout -b $Operator/$sprintName-$date origin/$BaseBranch
# 6. Create worktree: git worktree add ../$worktreeName $branchName
# 7. Run ensure-marketplace-qa-env.ps1 in the new worktree
# 8. Run doctor-marketplace-qa-env.mjs in the new worktree
# 9. Run zone-check.ps1 to verify no collisions
# 10. Print ready status: branch, worktree path, next steps
```

**Expected impact:** Reduces sprint startup from ~10 minutes to ~30 seconds. Eliminates manual copy-paste errors in branch naming. Guarantees pre-flight is always run.

**Risk:** Must validate the sprint-template exists before scaffolding. The script should refuse to scaffold a sprint that's already in-progress or whose dependencies aren't met.

---

### 2.4 Oreshnik Runner Implementation

**What:** Build `scripts/oreshnik/oreshnik.ps1` exactly as designed in `ORESHNIK_ORCHESTRATOR_DESIGN.md` — a central orchestrator that manages `init → validate → execute → log → checkpoint` cycles with human-in-the-loop gates.

**Why:** The design document exists but zero code was written. The `scripts/oreshnik/` directory is empty. Without the runner, every agent reinvents its own execution loop — no standardized logging, no checkpoint pausing, no halt capability. This is the single biggest gap between design and implementation.

**How to implement:**
1. Create the directory structure:
   ```
   scripts/oreshnik/
   ├── prompts/         # Prompt files with frontmatter (id, agent, sprint)
   ├── logs/            # Execution logs per run
   ├── runs/            # Run manifests (YYYYMMDD-HHMM.json)
   └── oreshnik.ps1     # Main runner
   ```
2. Implement `oreshnik.ps1` with commands:
   - `./oreshnik.ps1 scaffold --sprint S12 --operator Manuel` (calls scaffold-sprint.ps1)
   - `./oreshnik.ps1 run --sprint S12 --mode execute` (reads sprint definition, runs pre-flight, executes, logs)
   - `./oreshnik.ps1 align --sprint S12` (read-only pre-condition check, no modifications)
   - `./oreshnik.ps1 close --sprint S12` (generates closure report, updates docs)
   - `./oreshnik.ps1 status` (shows active run status)
   - `./oreshnik.ps1 halt` (stops any running process)
   - `./oreshnik.ps1 cleanup` (removes stale worktrees from closed sprints)
3. Each run creates a manifest:
   ```json
   {
     "timestamp": "2026-05-12T23:00:00-04:00",
     "sprint": "S12",
     "operator": "Manuel",
     "mode": "execute",
     "status": "in_progress",
     "steps": [
       { "id": "preflight", "status": "pass", "log": "logs/S12-20260512-2300/preflight.log" },
       { "id": "branch_create", "status": "pass", "log": "..." },
       { "id": "implement", "status": "pending", "log": null },
       { "id": "validate", "status": "pending", "log": null },
       { "id": "document", "status": "pending", "log": null },
       { "id": "commit", "status": "pending", "log": null },
       { "id": "push", "status": "pending", "log": null }
     ]
   }
   ```
4. Human-in-the-loop gates: Before any `git commit` or `git push`, oreshnik stops and waits for confirmation. The operator types `continue` or `halt` in the console.

**Expected impact:** Single biggest efficiency gain. Standardizes the execution loop that every sprint follows. Creates audit trail (run manifests) for every sprint. Enables resumability — if a session crashes, the run manifest tells exactly what step was active.

**Effort:** High. ~200 lines of PowerShell for the runner core, plus integration with scaffold/preflight/QA/zone-check scripts. 2-3 hours of implementation.

---

### 2.5 CI/CD-lite with Vercel Previews

**What:** Auto-deploy each sprint branch to a unique Vercel preview URL (e.g., `turpialsound-s12-manuel.vercel.app`) for immediate visual validation without local build.

**Why:** Every sprint in the methodology specifies "Preview required: yes." Currently, preview validation means either:
- Deploying manually to the central BKG preview (overwriting whatever was there)
- Running `next dev` locally

Manual deploy to shared preview creates a race condition — two operators deploying different branches overwrite each other. Local dev requires the operator to have the full stack running. Auto-preview-per-branch eliminates both problems.

**How to implement:**
1. Configure Vercel Git integration to auto-deploy all branches matching `Jean/*` and `Manuel/*` to preview environments.
2. Add a comment in the PR/merge flow that links to the preview URL.
3. Add to `zone-map.json` a `vercel_preview_url` field per sprint, populated automatically.
4. The oreshnik runner reads the preview URL and reports it in the run manifest.

**Expected impact:** Every sprint gets isolated, non-conflicting visual validation. Eliminates the "who deployed to the preview?" coordination problem. Reduces need for local Next.js dev server.

**Risk:** Preview URLs expose work-in-progress publicly. The current BKG preview is already public, so this is not a new risk. Sensitive env vars must be properly scoped per preview (already handled by Vercel).

---

### 2.6 Automated Closure Reports

**What:** Generate sprint closure reports automatically from `git log`, test results, and zone-map information, instead of manually writing them in `session-summary-active.md`, `next-window-brief.md`, and the markdown report template.

**Why:** The closure workflow (AGENT_CONTROL_BUS_RUNNER Section 8) requires manually updating 3-4 documents plus writing a structured report. Git already knows the branch, commits, files touched, and timestamps. Test scripts already produce PASS/FAIL output. The closure report is essentially a query over data that already exists.

**How to implement:**
1. Create `scripts/oreshnik/generate-closure-report.ps1`:
   ```powershell
   param([string]$SprintId)
   # 1. git log on sprint branch → extract commits, hashes, files
   # 2. Parse QA stdout/logs → extract PASS/FAIL counts
   # 3. zone-map.json → extract zones touched, locks verified
   # 4. Generate markdown report following the canonical template
   # 5. Optionally: auto-update session-summary-active.md
   ```
2. The report template from `AGENT_CONTROL_BUS_RUNNER.md:262-276` is already well-defined — the script fills in the blanks.
3. Operator reviews and approves before the report is committed (human-in-the-loop).

**Expected impact:** Reduces closure overhead from ~10 minutes to ~30 seconds. Eliminates copy-paste errors in report fields. Ensures consistent format across all sprint closures.

---

### 2.7 Token/Context Optimization

**What:** Pre-load only the files relevant to a specific sprint instead of requiring agents to read the entire `PLAN_MAESTRO_SPRINTS_2026-05-12.md` (964 lines), all 6 BUS runner documents, and every cross-reference.

**Why:** The AGENT_CONTROL_BUS_RUNNER instructs agents to read 6 full documents before any action. An agent executing S12 (Playwright purchase flow browser E2E) receives ~1500 lines of context, 80% of which is about Booking, Legal, Marketing, and other tracks irrelevant to the task. This wastes both tokens and cognitive load — the agent is more likely to miss relevant constraints buried in noise.

**How to implement:**
1. Create per-sprint context files: `docs/07_handoffs/sprint-context/S12.json`
   ```json
   {
     "sprint": "S12",
     "track": "T1",
     "owner": "Manuel",
     "branch": "Manuel/s12-purchase-flow-browser-2026-05-12",
     "base": "integration/today-reservas-marketplace-stable-2026-05-07",
     "depends_on": ["S11"],
     "zones_autorizadas": [
       "scripts/qa/playwright/**",
       "scripts/qa/fixtures/**",
       "var/qa-results/s12-*/**",
       "docs/07_handoffs/**"
     ],
     "zonas_prohibidas": [
       "app/", "components/", "actions/", "lib/", "prisma/",
       "app/(public)/reservas/**",
       "app/api/marketplace/payment-proofs/**"
     ],
     "locks_requeridos": [],
     "validacion": {
       "task_id": "qa_full_regression",
       "canonical_script": "npx tsx scripts/qa/run-marketplace-qa.mjs"
     },
     "stop_conditions": [
       "Booking files in diff",
       "Schema/migration required",
       "Secret in diff"
     ],
     "relevant_docs": [
       "docs/07_handoffs/next-window-brief.md",
       "scripts/qa/playwright/login.mjs"
     ]
   }
   ```
2. Modify AGENT_CONTROL_BUS_RUNNER step 1: instead of reading 6 general docs, read the sprint-specific context file. The context file is pre-generated from `zone-map.json` + sprint definitions.
3. Implement `scripts/oreshnik/sprint-context.ps1 --sprint S12` that auto-generates the context file from zone-map and sprint definitions.

**Expected impact:** Reduces context window consumption by ~70% per sprint. Agent receives exactly what it needs — zones, locks, validation, stop conditions — without noise from other tracks. Reduces likelihood of constraint violations caused by information overload.

**Effort:** Medium-low. Requires generating context files once per sprint. Can be part of the scaffold step.

---

### 2.8 Notification System (Dashboard Auto-Update)

**What:** When a sprint closes, auto-update `00_CENTRAL_TURPIAL.md` and notify collaborators by touching a marker file that both operators' systems can detect. Simple implementation: a git post-commit hook that writes a marker, and a dashboard script that reads it.

**Why:** Currently, when one operator closes a sprint, the other operator has zero notification. They discover the state change by manually reading `00_CENTRAL_TURPIAL.md` or `next-window-brief.md`. In practice, this means state goes stale and both operators may start sprint planning based on outdated information.

**How to implement (lightweight version):**
1. `scripts/oreshnik/update-dashboard.ps1`:
   ```powershell
   param([string]$SprintId, [string]$NewStatus)
   # 1. Read 00_CENTRAL_TURPIAL.md
   # 2. Update sprint table row for $SprintId: change 🔴 PENDIENTE → ✅ CERRADO
   # 3. Update PLAN_MAESTRO_SPRINTS_2026-05-12.md similarly
   # 4. Write marker: var/sprint-events/$(Get-Date -Format 'yyyyMMdd-HHmmss')_$SprintId_$NewStatus.json
   # 5. Commit both dashboard updates
   ```
2. The marker file `var/sprint-events/` serves as an event log. Both operators' machines run `oreshnik.ps1 status` to see recent events.
3. The closure report generator (Section 2.6) calls this automatically.

**Expected impact:** Eliminates the "I didn't know you already closed S13" coordination failure. Keeps the central dashboard as the single source of truth. The marker file provides an event log decoupled from dashboard formatting.

**Effort:** Low. ~50 lines of PowerShell. No external dependencies.

---

### 2.9 Parallel Console Manager (Safety Matrix)

**What:** Define a formal matrix: Sprint → Files Touched → Safe to Parallel With → Max Consoles. Create rules for when and how many parallel agent consoles can safely run based on the zone map.

**Why:** The methodology says "una zona activa por persona" but with 5 tracks and 27 sprints, the question of "can S12 and S-JB-01 run simultaneously?" requires manual checking of zone overlaps. There's no formal guidance on how many consoles are safe.

**How to implement:**
1. Create `docs/07_handoffs/parallel-console-matrix.json`:
   ```json
   {
     "max_total_consoles": 4,
     "max_per_operator": 2,
     "rule": "Any two sprints can run in parallel if their zone sets are disjoint",
     "matrix": {
       "S12": {
         "zones_touched": ["scripts/qa/playwright/*", "var/qa-results/s12-*"],
         "safe_with": ["S-JB-01", "S-JB-02", "S-JB-03", "S-JB-04", "S-MK-01", "S-MK-02", "S-MK-03", "S-MK-04", "S-MK-05", "S-MK-06", "S-ADM-01", "S-ADM-02", "S-ADM-03", "S-ADM-04", "S-UX-01", "S-UX-02"],
         "unsafe_with": ["S13", "S14", "S14B", "S18"],
         "reason_unsafe": "S13 requires S12. S14 requires S13. S14B shares marketplace-components zone. S18 is regression dependent."
       },
       "S-JB-01": {
         "zones_touched": ["app/(public)/reservas/*", "app/api/reservas/*", "components/reservas/*"],
         "safe_with": ["S12", "S13", "S14", "S14B", "S15", "S16", "S17", "S-MK-*", "S-ADM-*", "S-UX-*"],
         "unsafe_with": ["S-JB-02", "S-JB-03", "S-JB-04"],
         "reason_unsafe": "Same track, sequential dependency. Also shares /reservas zone."
       }
     }
   }
   ```
2. `scripts/oreshnik/parallel-check.ps1 --sprint S12` reads the matrix and prints which other sprints are safe to run in parallel.
3. Integrate into oreshnik runner: before `execute` mode, check that no conflicting sprint is active.

**Expected impact:** Operators can make parallelization decisions in seconds instead of manually diffing zone sets. Prevents the most dangerous failure mode: two agents mutating overlapping files simultaneously.

**Current state recommendation (see Section 4):** Based on zone analysis, 3 consoles can run safely RIGHT NOW: T1 (marketplace), T2 (booking), and T3 (crecimiento) have zero file overlap with each other.

---

## Section 3: Implementation Prioritization

### Ranking by Impact/Effort Ratio

| # | Optimization | Impact | Effort | Ratio | Category |
|---|-------------|--------|--------|-------|----------|
| 1 | Zone Map + Conflict Detection (2.2) | Prevents P0 collisions | Medium | Highest | Safety |
| 2 | Pre-flight Automation (2.1) | Catches env failures early | Low | Highest | Safety + Efficiency |
| 3 | Sprint Context Files (2.7) | Reduces context bloat 70% | Medium-Low | Very High | Efficiency |
| 4 | Automated Closure Reports (2.6) | Saves 10 min/sprint | Low | Very High | Efficiency |
| 5 | Parallel Console Matrix (2.9) | Enables true parallelism | Low | Very High | Safety + Speed |
| 6 | Automated Sprint Scaffolding (2.3) | Saves 10 min/sprint start | Medium | High | Efficiency |
| 7 | Notification System (2.8) | Keeps operators in sync | Low | High | Coordination |
| 8 | Oreshnik Runner (2.4) | Standardizes all workflows | High | Medium | Foundation |
| 9 | Vercel Preview Auto-Deploy (2.5) | Per-sprint visual validation | Medium | Medium | Quality |

### Implementation Schedule

**Immediately (this week):**

1. **Pre-flight Automation (2.1)** — Install git hooks. 30 minutes. Instant protection.
2. **Sprint Context Files (2.7)** — Generate context files for S12, S13, S14, S-JB-01. 45 minutes. Immediate token savings.
3. **Zone Map (2.2)** — Build `zone-map.json` covering all 5 tracks. 2 hours. Foundation for 2.9, 2.4, and 2.3.

**Short-term (next sprint cycle):**

4. **Parallel Console Matrix (2.9)** — Derive from zone-map. 30 minutes.
5. **Automated Sprint Scaffolding (2.3)** — Build on top of zone-map + pre-flight hook. 1.5 hours.
6. **Automated Closure Reports (2.6)** — 1 hour.

**Medium-term (after S14 closes):**

7. **Oreshnik Runner (2.4)** — Build the full runner integrating scaffolding, zone-check, closure reports. 3 hours. Required before scaling beyond 3 parallel consoles.
8. **Notification System (2.8)** — 30 minutes once oreshnik runner exists.
9. **Vercel Preview Auto-Deploy (2.5)** — Requires Jean (Vercel admin). 30 minutes configuration.

---

## Section 4: Recommended Console Allocation for Current State

### Safe Parallel Consoles RIGHT NOW

Based on zone analysis of current active state (2026-05-12):

| Console | Sprint | Track | Operator | Zone Risk | Can Parallel With |
|---------|--------|-------|----------|-----------|-------------------|
| **Console A** | S12 (Playwright purchase) | T1 Marketplace | Manuel | Low — only touches `scripts/qa/playwright/`, `var/qa-results/s12-*` | Console B, Console C |
| **Console B** | S-JB-01 (Booking fixes) | T2 Booking | Jean | Medium — touches `app/(public)/reservas/*`, `app/api/reservas/*` | Console A, Console C |
| **Console C** | S-MK-01 (Mercado/competencia) | T3 Crecimiento | Manuel | Low — docs only, zero code | Console A, Console B |

**Why these three are safe:**
- T1 (marketplace Playwright scripts) and T2 (booking) touch completely disjoint file trees.
- T3 is docs-only — no code, no collision risk with either T1 or T2.
- T4 (Admin-Legal) and T5 (UI/UX) require physical/design actions from Manuel — not parallelizable as agent work.

### What Must NOT Run in Parallel

- **S12 and S13**: Sequential dependency. S13 requires S12's screenshots and TX state.
- **S-JB-01 and S-JB-02**: Same track, sequential. S-JB-02 depends on S-JB-01 fixes.
- **S14B and S15**: Both touch `components/marketplace/**`. Zone collision risk.
- **S-UX-01 and any marketplace code sprint**: UX refactor touches the same component files. Must gate after T1/T2 stabilize.

### Max Consoles

| Scenario | Max Consoles | Explanation |
|----------|-------------|-------------|
| **Current state** | **3** | 2 operator machines × 3 safe zones (T1, T2, T3) — but each operator can realistically run only 1 agent console effectively at a time, so practical max is 2 with 1 docs background |
| **After zone-map + oreshnik runner** | **4** | 2 operators × 2 agent consoles each, with automated collision detection |
| **Theoretical max** | **6** | If all 5 tracks had disjoint zones, but this project's tracks T1 and T5 both touch `components/` so they can't all run simultaneously |

### Risk Mitigation for Multi-Console Work

1. **Before starting any console**: Run `zone-check.ps1 --sprint <ID>` to verify no active collisions.
2. **Push discipline**: No push to mother without running the pre-push hook (Section 2.1). This is the single highest-value guard.
3. **Worktree discipline**: Each sprint gets its own worktree. Never work directly in the main checkout for sprint work.
4. **Commit message convention**: Prefix every commit with the sprint ID, e.g., `[S12] feat: purchase flow Playwright spec`. This makes `git log` instantly scannable for which sprint touched what.
5. **Close before open**: Jean gatekeeps merge to mother. No sprint branch merges to mother without Jean's explicit review and the 9-item checklist from BUS_CONTROL_TURPIAL.

### Immediate Next Actions for Operators

**Jean:**
1. Push pending local changes (P0, blocking everything)
2. Configure `TS_MARKETPLACE_SENSITIVE_BLOB_READ_WRITE_TOKEN` in Vercel
3. Start Console B: `S-JB-01` in worktree `jean/s-jb-01-booking-fixes-2026-05-13`
4. Review Manuel's S12 closure when ready

**Manuel:**
1. Start Console A: `S12` in worktree `Manuel/s12-purchase-flow-browser-2026-05-12` (Playwright already installed on mother)
2. After S12 closes → S13 → S14 (sequential in T1)
3. Console C: `S-MK-01` market analysis can run in parallel with S12 since it's docs-only

---

## Appendix: Current State Snapshot (2026-05-12)

```
Mother branch: integration/today-reservas-marketplace-stable-2026-05-07 @ f7f2d1e
Active worktree:  Manuel/s14b-shopping-cart-share @ 7a658b4 (main checkout NOT mother — discrepancy)
Stale worktrees:  6 (closed sprints S01/S03, never cleaned up)
Pending P0:        Jean's uncommitted local changes, missing Vercel token
Next sprint:       S12 (Manuel, reasignado)
```

**Discrepancy note:** The main checkout is on `Manuel/s14b-shopping-cart-share`, not on mother. This means the current directory is a sprint branch, not the canonical mother. All scaffolding should use `origin/integration/today-reservas-marketplace-stable-2026-05-07` explicitly as base, not the current HEAD.
