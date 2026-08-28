import assert from 'node:assert/strict';
import { env } from 'node:process';
import { test } from 'node:test';
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
    }
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete env[key];
      else env[key] = value;
    }
  }
});
