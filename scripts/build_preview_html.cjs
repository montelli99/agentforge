const fs = require('node:fs');
const path = require('node:path');

// Retire the old design-only preview. AgentForge has one supported UI surface.
const output = path.resolve('design_preview.html');
fs.writeFileSync(
  output,
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="refresh" content="0; url=http://127.0.0.1:3460/">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>AgentForge</title>
  </head>
  <body>
    <p>Opening AgentForge… <a href="http://127.0.0.1:3460/">Continue</a></p>
  </body>
</html>
`,
  'utf8',
);
console.log(`Wrote ${output}`);
