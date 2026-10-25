# Adding a memory provider

AgentForge exports `MemoryProvider`, `MemoryQuery`, `OperationalMemoryRecord`,
`queryMemoryBounded`, `CompositeMemoryProvider`, `ConversationRuntime` and
`TaskWorkerRuntime` from the `agentforge` package. An embedded application can
implement a new memory source without editing AgentForge core. The standard
connection screen currently offers the built-in adapters; it does not install
arbitrary third-party code or automatically generate connection forms.

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
methods do not provide a plugin installer or credential persistence for custom
adapters. Do not replace a provider during active work.

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
