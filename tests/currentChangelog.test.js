import assert from 'node:assert/strict';
import { test } from 'node:test';
import { currentChangelog } from '../build/currentChangelog.js';

for (const header of [version => `Version ${version} (Release date: 2026-09-14)`, version => `版本 ${version}（发布日期：2026-09-14）`]) {
  test(`extracts the requested current entry and retains the preamble: ${header('2.7.0')}`, () => {
    const preamble = 'FlashMaster\nCopyright\n===================================\n';
    const entry = `${header('2.7.0-dev')}\n\nFlashMaster updates\n- Current UI\n\nfdnext v3.3.0\n- Current parser\n`;
    const source = `${preamble}${entry}\n===================================\n${header('2.6.0')}\n- Old release\n`;
    assert.equal(currentChangelog(source, '2.7.0'), preamble + entry);
    assert.equal(currentChangelog(source, '2.6.0+build'), `${preamble}${header('2.6.0')}\n- Old release\n`);
  });
}

test('handles a changelog containing only the current release', () => {
  assert.equal(currentChangelog('Version 2.7.0\n- Current\n', '2.7.0'), 'Version 2.7.0\n- Current\n');
});

test('fails instead of shipping unrelated history when the current version is absent', () => {
  assert.throws(() => currentChangelog('Version 2.6.0\n- Old\n', '2.7.0'), /no entry for app version 2.7.0/);
});
