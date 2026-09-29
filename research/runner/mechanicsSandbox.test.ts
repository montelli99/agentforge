import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeChild } from "./mechanicsHarness.js";
import { verifyDenial, runIsolated } from "./mechanicsSandbox.js";

test("actual Docker network-none denies HTTP and writable host mount", async () => {
  const root = process.cwd();
  const image = (await executeChild("docker", ["image", "inspect", "node:22-alpine", "--format", "{{.Id}}"], root)).trim();
  const directory = await mkdtemp(join(tmpdir(), "agentforge-denial-test-"));
  const proof = await verifyDenial(directory, image, root);
  assert.equal(proof.denied, true);
  assert.equal(proof.attemptedHttpRequests, 1);
  const stdout = await runIsolated(directory, image, ["-e", `try { require('node:fs').writeFileSync('/workspace/forbidden','x'); process.exit(1); } catch (e) { if (!['EROFS','EACCES'].includes(e.code)) throw e; console.log(e.code); }`], root);
  assert.match(stdout, /EROFS|EACCES/);
});
