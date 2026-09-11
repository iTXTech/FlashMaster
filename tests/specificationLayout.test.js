import assert from 'node:assert/strict';
import { test } from 'node:test';
import { specificationColumnSpan } from '../src/services/specificationLayout.js';

test('short fields share a row while speed, package and NAND details use enough columns', () => {
  // A 4-column specification sheet with 88px reserved for a Chinese label/gap.
  const span = valueWidth => specificationColumnSpan(88 + valueWidth, 185, 12, 4);
  assert.equal(span(45), 1);
  assert.equal(span(140), 2);
  assert.equal(span(215), 2);
  assert.equal(span(330), 3);
  assert.equal(span(700), 4);
  assert.equal(span(1600), 4);
});

test('spans shrink again when more width is available and never exceed the current columns', () => {
  assert.equal(specificationColumnSpan(280, 185, 12, 4), 2);
  assert.equal(specificationColumnSpan(280, 300, 12, 4), 1);
  assert.equal(specificationColumnSpan(900, 300, 12, 2), 2);
  assert.equal(specificationColumnSpan(900, 300, 12, 1), 1);
  assert.equal(specificationColumnSpan(280, 0, 12, 4), 1);
});

test('column gaps count toward the available width and rounding does not force text to wrap', () => {
  assert.equal(specificationColumnSpan(380, 185, 12, 4), 2);
  assert.equal(specificationColumnSpan(381.5, 185, 12, 4), 3);
});
