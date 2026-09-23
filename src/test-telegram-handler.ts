/**
 * Retired probe: this standalone test referenced a private historical
 * OpenClaw adapter. It never provided a reliable live Telegram acceptance test.
 */
console.error(
  "This Telegram integration probe is retired: no supported OpenClaw adapter is available here, so it cannot verify live Telegram routing. No provider request was sent.",
);
process.exitCode = 2;
