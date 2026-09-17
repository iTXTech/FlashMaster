import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildTime } from '../build/buildTime.js';

test('build overrides normalize offsets and RFC timestamps to UTC ISO 8601', () => {
  assert.equal(buildTime('2026-09-18T01:02:03.456+08:00', 'FDNEXT_BUILD_TIME'), '2026-09-17T17:02:03.456Z');
  assert.equal(buildTime(' Wed, 13 May 2026 11:11:04 GMT ', 'FLASHMASTER_BUILD_TIME'), '2026-05-13T11:11:04.000Z');
});

test('missing overrides use the current time and invalid overrides fail with the variable name', () => {
  const start = Date.now();
  const value = buildTime(' ', 'FDNEXT_BUILD_TIME');
  assert.ok(Date.parse(value) >= start && Date.parse(value) <= Date.now());
  assert.equal(new Date(value).toISOString(), value);
  assert.throws(() => buildTime('invalid', 'FDNEXT_BUILD_TIME'), /FDNEXT_BUILD_TIME must be a valid timestamp/);
});
