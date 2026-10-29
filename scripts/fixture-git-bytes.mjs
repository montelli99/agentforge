import fs from 'node:fs/promises';import path from 'node:path';
// Only call for newly created synthetic test repositories. Repository-local
// attributes override host line-ending defaults without changing user Git settings.
export async function preserveFixtureBytes(repository){
 await fs.writeFile(path.join(repository,'.git/info/attributes'),'* -text\n',{flag:'wx'});
}
