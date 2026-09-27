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

The operator-facing phase map that joins these sources to current evidence is
[`../GOAL_EXECUTION_MAP.md`](../GOAL_EXECUTION_MAP.md). It summarizes scope and
status without replacing the numbered requirement documents.

The canonical files above are available in this checkout under `docs/requirements/`. A former flattened convenience bundle was removed from this repository because it mixed public product material with private workspace notes and unrelated project records. It is not an AgentForge source of truth.

## Numbered source files and consolidated references

The named requirement files above are the set to inspect when an owner refers to the saved product requirements. The specific individually numbered originals are not present under `requirements/source/` or `docs/requirements/source/`, so do not invent or claim review of absent originals. Do not reintroduce flattened copies from external workspaces: duplicate basenames can overwrite one another and private context does not belong in the public product repository.

## Authority and status rules

1. `AUTONOMOUS_MASTER_BUILD_GOAL.md` is the primary acceptance source for the 0–49 master sections.
2. The extension, validation, and release-candidate documents add requirements; they do not renumber or replace the master sections.
3. The roadmap defines phase order, not proof that a phase was completed.
4. `README.md`, screenshots, UI prototypes, generated reports, and passing tests are evidence inputs only. None by itself proves requirement completion.
5. A requirement is complete only when its implementation and acceptance evidence are independently linked in the traceability audit. Fixture-only behavior must be labeled as such.
