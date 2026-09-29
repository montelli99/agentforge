import assert from "node:assert/strict";

const baseUrl = (process.argv[2] ?? process.env.AGENTFORGE_DEPLOYMENT_URL ?? "").replace(/\/$/, "");
assert.ok(baseUrl, "pass a deployment URL or set AGENTFORGE_DEPLOYMENT_URL");
const paths = ["/", "/404.html", "/robots.txt", "/sitemap.xml", "/github.html"];
const results = [];
for (const pathname of paths) {
  const response = await fetch(`${baseUrl}${pathname}`, { redirect: "follow" });
  const body = await response.text();
  results.push({ path: pathname, status: response.status, bytes: Buffer.byteLength(body) });
  assert.equal(response.status, 200, `${pathname} returned HTTP ${response.status}`);
  if (pathname === "/") {
    assert.match(body, /name="viewport"/i, "homepage is missing responsive viewport metadata");
    assert.match(body, /<footer\b/i, "homepage is missing a footer");
    assert.match(body, /github\.html/i, "homepage is missing the GitHub guide CTA");
    assert.match(body, /View source/i, "homepage is missing the source CTA");
  }
  if (pathname === "/github.html") assert.match(body, /github\.com\//i, "GitHub guide is missing a repository link");
}
console.log(JSON.stringify({ passed: true, baseUrl, routes: results }, null, 2));
