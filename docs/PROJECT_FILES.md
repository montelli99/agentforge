# Project files

Open a project and choose **Files → Connect folder**. Enter an absolute path to
one local project directory and select **Connect read-only**. This connection is
separate from the optional repository reference in project settings.

The browser lists folders and previews UTF-8 text/source files up to 256 KiB.
Use breadcrumbs to go back, the folder filter to narrow filenames, and Copy to
copy the open file. The reader scrolls horizontally for long source lines.
The folder list shows at most 1,000 entries and reports when truncated.

Connections persist with the local workspace. **Disconnect** revokes browsing
immediately. Changing the repository reference also revokes the previous grant.
Archived projects cannot browse files until restored. A replaced root directory
must be reconnected. Connections do not grant editing, command execution, or
model access; these remain separate capabilities.

Only authorized owners and administrators can connect or browse folders.
Hidden directories, common credential files, dependency directories, filesystem
links, and hard-linked file previews are excluded. These exclusions are not a
secret scanner: connect only a project folder that is appropriate for those
workspace members. Entire drives, the home directory, and UNC paths cannot be
connected. Binary files and non-UTF-8 text have an explanatory unavailable state.

## Verification

After building, run `node scripts/project-files-acceptance.mjs`. It uses a generic
temporary folder and the real HTTP server to check explicit connection, file
contents, path traversal denial, linked-file denial, preview limits, archive
behavior, persistence after restart, disconnect, and reference-change revocation.
It does not use personal accounts or execute project code.

The Files tab, connection form, subfolder navigation, and source preview have
also been checked in the browser at desktop width and a 390-pixel viewport.
# Public library entrypoint

`src/index.ts` is the provider-neutral package surface for AgentForge, Workflow Engine, JEv, setup orchestration, memory/context evaluation, release readiness, model routing, and Telegram/Discord transports. It intentionally excludes deployment credentials, private workspace state, and business-specific integrations.
