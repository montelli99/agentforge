/** Conservative overlap check for literal protections, directory/** and final-prefix*.
 * Protections may name .git; writable grants must still reject it independently.
 */
export function assertNoProtectedMountOverlap(writable: readonly string[], protections: readonly string[]) {
  const parsed = protections.map(pattern => {
    const directory = pattern.endsWith('/**');
    const wildcard = !directory && pattern.endsWith('*');
    const value = directory ? pattern.slice(0, -3) : wildcard ? pattern.slice(0, -1) : pattern;
    if (!/^[a-zA-Z0-9_.][a-zA-Z0-9_./-]*$/.test(value)
      || value.split('/').some(part => !part || part === '.' || part === '..'))
      throw Error('Unsupported protected path pattern.');
    return {value: value.toLowerCase(), wildcard};
  });
  for (const grant of writable) for (const protection of parsed) {
    const w = grant.toLowerCase(), p = protection.value;
    if (w === p || p.startsWith(w + '/') || (protection.wildcard ? w.startsWith(p) : w.startsWith(p + '/')))
      throw Error('Writable mount overlaps a protected path.');
  }
}
