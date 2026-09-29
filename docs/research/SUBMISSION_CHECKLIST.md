# AgentForge paper submission checklist

Status: preparation only. Nothing here means a submission has been made or accepted.

## Evidence gate

- [x] `CAPABILITY_EVIDENCE.md` has current source paths and evidence grades.
- [x] `PROTOCOL.md` is frozen with a version and hash.
- [ ] All primary outcomes have measured denominators, uncertainty and failure counts.
- [x] Mechanics results are reproducible from a clean checkout with synthetic data; model-backed outcomes remain unmeasured.
- [ ] Every number in `paper.md` matches a sanitized machine-readable result.
- [x] No mechanics-only result is described as model quality, cost savings, or production reliability.
- [ ] An independent human has reviewed safety failures, false completions and a sample of successes.

## Public release gate

- [ ] Owner-approved author list, affiliations, contributions, funding and conflicts.
- [ ] AI-use disclosure completed and human responsibility confirmed.
- [x] No credentials, private paths, personal messages, seller/CRM records, or business data.
- [ ] Third-party code, data and citations have license/attribution records.
- [ ] Apache-2.0 applies to AgentForge code; paper/data licenses are explicitly selected.
- [x] Local public repository commit, protocol/input checksums and reproduction commands recorded in `RELEASE_EVIDENCE.md`; release tag remains open.
- [x] Local review-packet manifest verifies the paper, protocol, results, reproduction, source trace, evidence, checklist and sanitized mechanics record are present and remain explicitly mechanics-only.
- [x] Related-work source-register acceptance checks required OpenClaw, Hermes, OpenMuse and primary research links plus pinned source revisions.
- [x] Website research page links to the exact paper, protocol, results and reproduction commands.
- [x] Desktop/mobile website links and downloads verified by the static link and mobile acceptance checks.

## Zenodo DOI archive

- [ ] Final PDF, source, protocol, fixtures, runner, sanitized results and reproduction README assembled.
- [ ] Metadata reviewed: title, real creators, abstract, keywords, version and related GitHub release.
- [ ] Draft upload reviewed before publishing; published files cannot be edited in place.
- [ ] Owner approves publication action.
- [ ] DOI and version DOI recorded in the website, repository and paper.

## arXiv preprint

- [ ] Scientific contribution and category fit reviewed; provisional category is `cs.AI`.
- [ ] Author account and any endorsement requirement resolved.
- [ ] LaTeX/source package builds to the inspected PDF.
- [ ] References, figures, tables, captions and supplementary files are complete.
- [ ] Author submits personally where arXiv policy requires it.
- [ ] Announcement/moderation status recorded separately from peer review.

## TMLR peer review

- [ ] Results justify a research submission rather than a product announcement.
- [ ] Manuscript is anonymized, including repository links and supplementary materials.
- [ ] All authors have complete OpenReview profiles and conflicts.
- [ ] No overlapping archival peer-reviewed submission exists.
- [ ] TMLR template, license, broader-impact and AI-use requirements checked.
- [ ] Owner approves final author list and submission.
- [ ] Reviews, rebuttal, revisions and final decision tracked in a response matrix.

## JOSS later option

- [ ] More than six months of active public repository history.
- [ ] Demonstrated external research use and evidence of impact.
- [ ] Feature-complete maintainable software and documentation.
- [ ] JOSS paper and software-review package prepared.
- [ ] AI-use disclosure and human review completed.

## Publication states

Use exact state labels in every report:

`DRAFT` → `MECHANICS_VERIFIED` → `RESULTS_VERIFIED` → `OWNER_APPROVED` → `ARCHIVED_DOI` / `PREPRINT_SUBMITTED` / `PEER_REVIEW_SUBMITTED` → `ACCEPTED`.

Never use “published,” “peer reviewed,” “accepted,” or “validated” when the evidence only supports an earlier state.

## Current checkpoint (2026-09-29)

Current state: `MECHANICS_VERIFIED`.

The local mechanics, adapter, memory, package, privacy, website, crash-recovery, and Docker acceptance evidence is complete for its stated scope, and hosted CI run `36590598981` passed all seven jobs. `RESULTS_VERIFIED` is not reached: model-backed outcomes, comparative quality, cost, latency, and token-use measurements remain unmeasured. No owner approval, DOI, preprint, peer-review submission, or publication action has occurred.
