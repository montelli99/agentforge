/**
 * Redaction at the durable-evidence boundary. Execution output is untrusted:
 * a command may echo a credential even when the sandbox did not receive it.
 */
const VALUE_PATTERNS: RegExp[] = [
  /\b(?:sk|rk|pk)-[A-Za-z0-9_-]{16,}\b/g,
  /\b\d{8,12}:[A-Za-z0-9_-]{20,}\b/g,
  /\bxox(?:b|p|a|r|s)-[A-Za-z0-9-]{10,}\b/gi,
  /\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+\/=:-]{8,}/gi,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
  /\b(?:api[_-]?key|token|secret|password)\s*[=:]\s*[^\s'\"`]{8,}/gi,
];

const SECRET_FIELD = /(token|secret|password|api_?key|private_?key|authorization|auth)/i;

function runtimeSecretValues(): string[] {
  return Object.entries(process.env)
    .filter(([key, value]) => Boolean(value) && SECRET_FIELD.test(key))
    .map(([, value]) => value as string)
    .filter(value => value.length >= 8)
    .sort((a, b) => b.length - a.length);
}

/** Redacts recognized credential formats and any configured secret value. */
export function redactRuntimeText(value: string): string {
  let redacted = value;
  for (const secret of runtimeSecretValues()) redacted = redacted.split(secret).join("[REDACTED_SECRET]");
  for (const pattern of VALUE_PATTERNS) {
    pattern.lastIndex = 0;
    redacted = redacted.replace(pattern, match => /^Bearer\s/i.test(match) ? "Bearer [REDACTED_SECRET]" : "[REDACTED_SECRET]");
  }
  return redacted;
}


/** Converts an unknown error into a safe message for an API or durable status surface. */
export function redactRuntimeError(error: unknown, fallback = "An unexpected error occurred."): string {
  if (error instanceof Error && error.message) return redactRuntimeText(error.message);
  if (typeof error === "string" && error) return redactRuntimeText(error);
  return fallback;
}

/** Recursively redacts textual values before writing diagnostic objects durably. */
export function redactRuntimeValue(value: unknown): unknown {
  if (typeof value === "string") return redactRuntimeText(value);
  if (Array.isArray(value)) return value.map(redactRuntimeValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
      key,
      // Field names are evidence too: a short credential can evade format
      // matching, so a credential-shaped field is never persisted verbatim.
      SECRET_FIELD.test(key) ? "[REDACTED_SECRET]" : redactRuntimeValue(entry),
    ]));
  }
  return value;
}
