# Adding a memory provider

AgentForge exports `MemoryProvider`, `MemoryQuery`, `OperationalMemoryRecord`,
`queryMemoryBounded`, `CompositeMemoryProvider`, `ConversationRuntime` and
`TaskWorkerRuntime` from the `agentforge` package. An embedded application can
implement a new memory source without editing AgentForge core. The standard
connection screen offers built-in adapters and additional providers explicitly
registered by the host. It does not install arbitrary third-party code.

Implement all five provider operations: `record`, `get`, `query`, `delete`, and
`getDoNotRepeatRules`. A read-only source must reject unsupported writes and
deletes explicitly. Do not return success for an operation the source cannot do.
Keep credentials in the host's private credential store, not records, source
identifiers, logs, errors, exported configuration or model context.

Every result must include an ID, namespace, category, title, content, tags and
creation timestamp. Project-specific records carry their exact `projectId`.
Omitting it means shared workspace data, not an unknown project. Honor query
cancellation, preserve ranked order, and mark archived records. The shared
bounded helper rejects malformed and oversized responses, applies namespace,
project, category, tag and archive filters, and caps returned results. It allows
projectless shared records; chat and explicit project connections apply stricter
project selection. A timeout cannot cancel an external operation that ignores
the signal. The helper never retries automatically.

## Connect an embedded runtime

For guided setup, pass `memoryConnections: definitions` in the fifth options
argument to the exported `AgentForgeWebServer` constructor. Each
`MemoryConnectionDefinition` declares an ID, version, display name, description,
text/secret fields and a synchronous `create` factory. The host installs and
trusts this code; browser users cannot submit executable factories. Do network
work in `query`, which is bounded during the connection check. Explain where data
goes in the description. A connection check may contact or bill the service.

The form renders registered fields, treats secret fields as password inputs,
and uses the existing owner/admin authorization, explicit sharing consent and
encrypted save/restore flow. Restore requires the same registered version;
removed or changed definitions fail without replacing the current connection.
Only declared string fields are accepted. Re-register the definition when the
host restarts. No automatic module discovery or plugin marketplace is implied.

With an already configured `chat` ConversationRuntime, `worker` TaskWorkerRuntime,
and your `provider` implementing MemoryProvider:

```ts
await worker.withMemoryChange(async () => {
  await chat.changeMemory(async () => ({
    projectId: "example-project",
    memoryNamespace: "example-workspace",
    memoryProvider: provider,
  }));
  worker.setProjectMemory("example-project", provider, "example-workspace");
});
```

The host must authenticate configuration changes, validate the connection before
activation, and persist/reconstruct its configuration after restart. These
methods do not provide a plugin installer or credential persistence by
themselves; use the guided registered-provider path for encrypted persistence.
Do not replace a provider during active work.

For simultaneous recall, create `new CompositeMemoryProvider(namespace,
projectId, [{ alias: "notes", provider: notes }, { alias: "archive", provider:
archive }])`. It accepts one to eight explicitly selected sources, qualifies
source identities, preserves each source's ranking, and interleaves results.
It does not compare scores from different engines or resolve conflicting facts.
If a source fails, the combined request fails rather than implying complete
recall. Composition is read-only; choose an individual source for mutation.

## Acceptance before advertising support

Verify project/namespace isolation, explicitly shared records, archived/deleted
records, duplicate IDs, conflicting facts, outage and cancellation behavior,
credential-free errors, provenance, and restoration after restart. Verify the
same provider through chat and task context. Use synthetic data first, then a
disposable account for live acceptance. Built-in tests and an exported interface
do not prove a new remote service works. JEv is presently a decision/router
integration, not a memory adapter.

### Returned record ownership

Return structured-cloneable data from memory queries, including metadata. The shared query boundary snapshots each result before validating its scope and content. Adapters may reuse their own records internally, but subsequent mutations do not update already-returned context. Functions and other non-cloneable values are rejected with a generic provider-response error. This protects snapshot consistency; provider plugins still execute as trusted host code and are not sandboxed by cloning.

### Conflicting records during planning

Planning retrieves safety rules and topical memories separately. If those lookups return the same record ID with different model-visible content, scope, source identity, category, tags or revision timestamps, context construction fails rather than silently choosing one. Identical duplicates are included once. Resolve or refresh the source before requesting a new plan. This detects observed conflicts; it does not establish a transactional snapshot across independent remote stores or detect corrections absent from all returned results.

The shared lookup boundary also checks duplicate IDs within each provider response before truncating accepted results. Identical records collapse to one; conflicting records reject the lookup, including conflicts beyond the requested result limit. Combined providers therefore cannot hide a source conflict through their own duplicate removal. Different source aliases remain separate identities; this is not semantic contradiction detection between unrelated records.
