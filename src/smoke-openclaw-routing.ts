/**
 * Retired probe: the historical OpenClaw streaming adapter and dashboard API
 * used by this test are no longer present. No live integration is exercised.
 */
console.error(
  "This OpenClaw routing probe is retired: its adapter and dashboard endpoint are unavailable. Use the vNext readiness/soak checks; this does not verify OpenClaw or Telegram integration.",
);
process.exitCode = 2;
