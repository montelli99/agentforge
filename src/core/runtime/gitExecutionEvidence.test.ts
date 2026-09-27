import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { readGitHeadSha } from "./gitExecutionEvidence.js";

describe("Git execution evidence", () => {
  it("records the immutable observed HEAD revision", async () => {
    const expected = execFileSync("git", ["rev-parse", "HEAD"], { cwd: process.cwd(), encoding: "utf8" }).trim();
    await expect(readGitHeadSha(process.cwd())).resolves.toBe(expected);
  });
});
