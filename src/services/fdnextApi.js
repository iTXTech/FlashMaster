import { createEngine } from '@itxtech/fdnext-core';
import {
  compileIdentifierRulesToDecoders,
  compileRulesToDecoders,
  defaultDslRules,
  defaultIdentifierRules
} from '@itxtech/fdnext-dsl';
import { embeddedResourceBundle } from '../../vendor/fdnext/packages/resources';
import { summaryText } from '@/services/fdnextResultView';
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

export const getEmbeddedInfo = () => {
  const capabilities = getEngine().getCapabilities();
  return {
    ...capabilities,
    server: {
      ...capabilities.server,
      name: 'Embedded iTXTech fdnext',
      version: typeof FDNEXT_VERSION !== 'undefined' ? FDNEXT_VERSION : capabilities.server?.version || getEngine().getVersion()
    }
  };
};

export const decodeEmbeddedPartNumber = pn => getEngine().decodePart({
  query: pn,
  lang: currentLang()
});

export const searchEmbeddedPartNumber = (pn, limit = 0) => getEngine().searchParts({
  query: pn,
  lang: currentLang(),
  ...limitOption(limit)
});

export const summarizeEmbeddedPartNumber = pn => summaryText(decodeEmbeddedPartNumber(pn));

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

export const summarizeEmbeddedFlashId = id => summaryText(decodeEmbeddedFlashId(id));
