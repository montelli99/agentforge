/**
 * Retired probe: the historical OpenClaw adapter and dashboard API used by
 * this test are no longer present. No provider request is sent.
 */
console.error(
  "This repeated-context probe is retired: its OpenClaw adapter and dashboard endpoint are unavailable. It does not measure token savings or test Telegram integration.",
);
process.exitCode = 2;
