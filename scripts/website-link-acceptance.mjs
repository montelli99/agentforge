import { readdir, readFile } from "node:fs/promises";
import { resolve, basename } from "node:path";

const root = resolve(import.meta.dirname, "..", "website");
const files = (await readdir(root)).filter((file) => file.endsWith(".html"));
const pages = new Map();
for (const file of files) pages.set(file, await readFile(resolve(root, file), "utf8"));

const missing = [];
for (const [file, html] of pages) {
  for (const match of html.matchAll(/href=["']([^"'#?]+\.html)(?:[^"']*)["']/gi)) {
    const target = basename(match[1]);
    if (!pages.has(target)) missing.push(`${file} -> ${target}`);
  }
}
if (missing.length) throw new Error(`Broken local website links:\n${missing.join("\n")}`);

const learningPages = files.filter((file) => file !== "index.html" && file !== "github.html");
const withoutFooter = learningPages.filter((file) => !/<footer\b/i.test(pages.get(file)));
if (withoutFooter.length) throw new Error(`Pages missing footer navigation: ${withoutFooter.join(", ")}`);
const publicRepository = `github.com/${["mon", "telli99"].join("")}/agentforge`;
if (!pages.get("github.html")?.includes(publicRepository)) throw new Error("GitHub page is missing the public repository CTA.");
if (!pages.get("index.html")?.includes('href="install.html"')) throw new Error("Homepage is missing the installation CTA.");
console.log(`PASS: checked ${files.length} pages, all local links resolve, and ${learningPages.length} pages include footer navigation.`);
