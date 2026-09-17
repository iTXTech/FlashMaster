import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { test } from 'node:test';
import { formatLocalDateTime } from '../src/services/localDateTime.js';

test('local timestamps follow the host time zone, including date rollover and daylight saving', () => {
  const moduleUrl = new URL('../src/services/localDateTime.js', import.meta.url).href;
  const script = `import { formatLocalDateTime } from ${JSON.stringify(moduleUrl)};
    console.log(JSON.stringify([
      formatLocalDateTime('2026-01-01T00:00:00.000Z', 'eng'),
      formatLocalDateTime('2026-07-01T00:00:00.000Z', 'eng')
    ]));`;
  const render = TZ => JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script], {
    env: { ...process.env, TZ }, encoding: 'utf8'
  }));
  const newYork = render('America/New_York');
  assert.match(newYork[0], /31\/12\/2025, 19:00:00/);
  assert.match(newYork[1], /30\/06\/2026, 20:00:00/);
  const shanghai = render('Asia/Shanghai');
  assert.match(shanghai[0], /01\/01\/2026, 08:00:00/);
  assert.match(shanghai[1], /01\/07\/2026, 08:00:00/);
});

test('invalid timestamps remain visible instead of breaking the capabilities dialog', () => {
  assert.equal(formatLocalDateTime('not reported', 'chs'), 'not reported');
});
