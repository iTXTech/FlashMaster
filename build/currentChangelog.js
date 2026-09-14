import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const baseVersion = version => version.replace(/[-+].*$/, '');

export function currentChangelog(source, version) {
  const headings = [...source.matchAll(/^(?:Version\s+|版本\s*)(\d+\.\d+\.\d+(?:-[\w.-]+)?)(?=[\s（(])/gm)];
  const index = headings.findIndex(heading => baseVersion(heading[1]) === baseVersion(version));
  if (index === -1) throw new Error(`Changelog has no entry for app version ${version}`);

  const preamble = source.slice(0, headings[0].index);
  const section = source.slice(headings[index].index, headings[index + 1]?.index)
    .replace(/\n=+\s*$/, '').trim();
  return `${preamble}${section}\n`;
}

export function currentChangelogPlugin(root, version) {
  const files = new Set(['CHANGELOG.txt', 'CHANGELOG-zh.txt'].map(file => resolve(root, file)));
  return {
    name: 'flashmaster-current-changelog',
    enforce: 'pre',
    load(id) {
      if (!id.endsWith('?raw')) return;
      const file = id.slice(0, -4);
      if (!files.has(file)) return;
      this.addWatchFile(file);
      return `export default ${JSON.stringify(currentChangelog(readFileSync(file, 'utf8'), version))};`;
    }
  };
}
