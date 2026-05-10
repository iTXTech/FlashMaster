import { createEngine } from '@itxtech/fdnext-core';
import {
  compileIdentifierRulesToDecoders,
  compileRulesToDecoders,
  defaultDslRules,
  defaultIdentifierRules
} from '@itxtech/fdnext-dsl';
import { embeddedResourceBundle } from '../../vendor/fdnext/packages/resources';
import store from '@/store';

let engine;

function getEngine() {
  if (!engine) {
    engine = createEngine({
      resources: embeddedResourceBundle,
      decoders: compileRulesToDecoders(defaultDslRules),
      identifierDecoders: compileIdentifierRulesToDecoders(defaultIdentifierRules)
    });
  }
  return engine;
}

function currentLang() {
  return store.getLang();
}

function limitOption(limit) {
  const value = Number(limit);
  return Number.isFinite(value) && value > 0 ? { limit: value } : {};
}

export function summarizeFdnextResult(result) {
  if (!result || typeof result !== 'object') return '';
  const lines = [];
  const device = result.device || {};
  const identity = device.partNumber || device.identifier || result.input?.normalized || result.input?.query;
  const vendor = device.vendor?.name || device.vendor?.id;
  if (identity || vendor) {
    lines.push([vendor, identity].filter(Boolean).join(' · '));
  }
  if (result.subtitle) {
    lines.push(result.subtitle);
  }
  for (const block of result.blocks || []) {
    for (const field of block.fields || []) {
      const value = field.display ?? (field.unit ? `${field.value} ${field.unit}` : field.value);
      if (value !== undefined && value !== null && value !== '') {
        lines.push(`${field.label || field.key}: ${Array.isArray(value) ? value.join(', ') : value}`);
      }
    }
  }
  return [...new Set(lines)].join('\n');
}

export const getEmbeddedInfo = () => ({
  ...getEngine().getCapabilities(),
  parser: {
    type: 'embedded',
    name: 'iTXTech fdnext',
    version: typeof FDNEXT_VERSION !== 'undefined' ? FDNEXT_VERSION : getEngine().getVersion()
  }
});

export const decodeEmbeddedPartNumber = pn => getEngine().decodePart({
  query: pn,
  lang: currentLang()
});

export const searchEmbeddedPartNumber = (pn, limit = 0) => getEngine().searchParts({
  query: pn,
  lang: currentLang(),
  ...limitOption(limit)
});

export const summarizeEmbeddedPartNumber = pn => summarizeFdnextResult(decodeEmbeddedPartNumber(pn));

export const decodeEmbeddedFlashId = id => getEngine().decodeIdentifier({
  query: id,
  lang: currentLang(),
  idScheme: 'nand.flash_id'
});

export const searchEmbeddedFlashId = (id, limit = 0) => getEngine().searchIdentifiers({
  query: id,
  lang: currentLang(),
  idScheme: 'nand.flash_id',
  ...limitOption(limit)
});

export const summarizeEmbeddedFlashId = id => summarizeFdnextResult(decodeEmbeddedFlashId(id));
