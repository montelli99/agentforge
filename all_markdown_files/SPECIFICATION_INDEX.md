# AgentForge Requirements Source Index

This index keeps separately issued specification families distinct. Their section numbers overlap and are not interchangeable; use filenames and document titles when citing requirements.

## Current recovered specification set

| Source document | Role | Numbered scope |
|---|---|---|
| [`AUTONOMOUS_MASTER_BUILD_GOAL.md`](AUTONOMOUS_MASTER_BUILD_GOAL.md) | Primary master build goal recovered from the Antigravity task record | 0–49 |
| [`EXTENSION_GUIDE.md`](EXTENSION_GUIDE.md) | Additions for commercial model, packages, process/Scribe, voice, and UX | 1–33 |
| [`VALIDATION_MIGRATION_RELEASE_GOAL.md`](VALIDATION_MIGRATION_RELEASE_GOAL.md) | Validation, migration, installation, durability, and release-hardening requirements | 0–42 |
| [`RELEASE_CANDIDATE_GOAL.md`](RELEASE_CANDIDATE_GOAL.md) | Release-candidate verification and documentation requirements | 0–48 |
| [`COMPLETE_AUTONOMOUS_ROADMAP.md`](COMPLETE_AUTONOMOUS_ROADMAP.md) | Release-candidate roadmap and phase sequencing | Roadmap phases |
| [`COMPLETION_ENGINE_SPECIFICATION.md`](COMPLETION_ENGINE_SPECIFICATION.md) | Completion evidence, audit, and repair-engine requirements | Engine specification |
| [`IMPLEMENTATION_TRACEABILITY.md`](IMPLEMENTATION_TRACEABILITY.md) | Current code/test/evidence mapping for master sections 0–49 | Sections 0–49 |
| [`MARKDOWN_REVIEW_REGISTER.md`](MARKDOWN_REVIEW_REGISTER.md) | Inventory and factual review log for repository and recovered Markdown | Review register |

The canonical files above are available in this checkout. A consolidated reference set containing 54 Markdown documents plus `INDEX.md` is also present at both `C:\Users\mscott\AI_Workspace\all_markdown_files\` and `AgentForge-Staging\all_markdown_files\`; a SHA-256 comparison confirmed that the two copies matched at the start of this review. Canonical corrections made in this checkout may make the outer convenience copy stale. The consolidated set contains repo docs, Antigravity artifacts, workspace operating notes, and unrelated project records. It is a flat convenience mirror, not an additional 54 AgentForge specifications.

## Numbered source files and consolidated references

The consolidated 54-document set described above is present and is the set to inspect when the user refers to the saved Markdown bundle. It includes 54 source Markdown files plus a generated index; names and paths show that these are not 48 separately numbered Markdown files. The specific individually numbered originals are not present under `requirements/source/` or `docs/requirements/source/`, so do not invent or claim review of absent originals. A follow-up inventory found 52 Markdown files across the Antigravity brain directory, but only `implementation_plan.md` and `walkthrough.md` belong to the AgentForge vNext kickoff task; the others belong to separate OpenClaw, Paperclip, Agent Zero, hardware, and CRM tasks. The flat archive may overwrite duplicate basenames during consolidation; SHA-256 equality between the two current mirror folders proves they match each other, not that they preserve every source path or are byte-for-byte originals.

## Authority and status rules

1. `AUTONOMOUS_MASTER_BUILD_GOAL.md` is the primary acceptance source for the 0–49 master sections.
2. The extension, validation, and release-candidate documents add requirements; they do not renumber or replace the master sections.
3. The roadmap defines phase order, not proof that a phase was completed.
4. `README.md`, screenshots, UI prototypes, generated reports, and passing tests are evidence inputs only. None by itself proves requirement completion.
5. A requirement is complete only when its implementation and acceptance evidence are independently linked in the traceability audit. Fixture-only behavior must be labeled as such.
