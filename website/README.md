# AgentForge website

This directory is a static, sample-data-only product site. It is intentionally
separate from the local AgentForge control plane and does not require provider
credentials, a database, or a CRM connection.

## Preview

From this directory, run `node serve.mjs` and open the printed local URL. The
server binds to loopback only and serves `index.html` plus the visual assets.

## Deployment

Deploy the directory to any static HTTPS host that supports an `index.html`
entrypoint. Do not upload `.env` files, workspace stores, logs, credentials,
runtime sessions, or generated local data. Keep the Apache-2.0 `LICENSE` at the
repository root and link to the public repository from the site.

## Content boundary

The site describes AgentForge, Workflow Engine, JEv, model routing, memory, and
channel adapters using sample records. It must never contain private contact
data, live provider tokens, seller records, or claims that a provider is live
unless the corresponding runtime acceptance evidence is published. It uses
system fonts and has no external presentation fetches, so the static preview
does not silently contact a font or analytics provider.

The public `research.html` page links the evaluation protocol, sanitized results,
execution status matrix, manuscript scaffold, and local reproduction commands.

Do not add paid-plan prices, uptime commitments, support promises, or a public
repository URL until the owner has selected and authorized those commitments.
