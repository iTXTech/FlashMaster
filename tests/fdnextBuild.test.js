import assert from 'node:assert/strict';
import { env } from 'node:process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { build } from 'vite';
import makeConfig from '../vite.config.js';

test('only full/nano use classic inline workers; fallback and HTTP-only capabilities stay distinct', () => {
  const overrideKeys = ['VITE_FLASHMASTER_BUILD_FLAVOR', 'FLASHMASTER_BUILD_FLAVOR'];
  const saved = overrideKeys.map(key => [key, env[key]]);
  try {
    for (const key of overrideKeys) delete env[key];
    for (const [mode, inline, embedded, fallback] of [
      ['production', false, true, true],
      ['singlefile', true, true, false],
      ['singlefile-nano', true, true, false],
      ['singlefile-pico', false, false, false]
    ]) {
      const config = makeConfig({ mode });
      const aliases = config.resolve.alias;
      assert.equal(config.worker?.format, inline ? 'iife' : undefined, mode);
      assert.equal(config.define.__FLASHMASTER_MAIN_THREAD_FALLBACK__, JSON.stringify(fallback), mode);
      assert.equal(config.define.__FLASHMASTER_EMBEDDED_PARSER__, JSON.stringify(embedded), mode);
      assert.equal(
        Boolean(aliases.find(alias => alias.find === '@/services/fdnextWorkerFactory')),
        inline, mode
      );
      const httpOnly = aliases.find(alias => alias.find === '@/services/fdnextApi');
      assert.equal(Boolean(httpOnly), !embedded, mode);
      if (httpOnly) assert.ok(httpOnly.replacement.endsWith('fdnextApiHttpOnly.js'));
      const installer = aliases.find(alias => alias.find === '@/composables/usePwaInstall');
      assert.equal(Boolean(installer), mode !== 'production', mode);
    }
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete env[key];
      else env[key] = value;
    }
  }
});

test('single-file output excludes installer modules, styles, messages and historical changelogs', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'flashmaster-build-test-'));
  const modules = new Set();
  try {
    const config = makeConfig({ mode: 'singlefile-pico' });
    const result = await build({
      ...config,
      root: fileURLToPath(new URL('..', import.meta.url)),
      configFile: false,
      mode: 'singlefile-pico',
      logLevel: 'silent',
      build: { ...config.build, outDir, write: false, reportCompressedSize: false },
      plugins: [...config.plugins, {
        name: 'inspect-singlefile-modules',
        moduleParsed(module) { modules.add(module.id); }
      }]
    });
    for (const id of modules) {
      assert.doesNotMatch(id, /\/(?:services\/pwaInstall\.js|composables\/usePwaInstall\.js|components\/PwaInstall(?:Prompt|Dialog)\.vue)(?:\?|$)/);
    }
    const html = result.output.find(asset => asset.fileName === 'index.html')?.source;
    const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
    assert.ok(modules.size > 0);
    assert.equal(typeof html, 'string');
    assert.doesNotMatch(html, /beforeinstallprompt|promotionVisible|schedulePromotion|install-promotion|install-guide-steps|Browser installation help/);
    assert.doesNotMatch(html, /Version 2\.6\.0|版本 2\.6\.0/);
    assert.ok(html.includes(`Version ${version}`));
    assert.ok(html.includes(`版本 ${version}`));
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});
