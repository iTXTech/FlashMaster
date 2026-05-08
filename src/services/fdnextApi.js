import { createEngine } from '@itxtech/fdnext-core';
import {
  compileFlashIdRulesToDecoders,
  compileRulesToDecoders,
  defaultDslRules,
  defaultFlashIdRules
} from '@itxtech/fdnext-dsl';
import { embeddedResources } from '../../vendor/fdnext/packages/resources';
import store from '@/store';

let engine;

function getEngine() {
  if (!engine) {
    engine = createEngine({
      resources: embeddedResources,
      decoders: compileRulesToDecoders(defaultDslRules),
      flashIdDecoders: compileFlashIdRulesToDecoders(defaultFlashIdRules)
    });
  }
  return engine;
}

function dispatch(endpoint, context = {}) {
  const payload = getEngine().dispatch(endpoint, {
    lang: store.getLang(),
    ...context
  });
  if (payload && payload.result === false) {
    throw new Error(payload.message || 'fdnext request failed');
  }
  return payload;
}

export const getEmbeddedInfo = () => dispatch('info');

export const decodeEmbeddedPartNumber = pn => dispatch('decode', { pn });

export const searchEmbeddedPartNumber = (pn, limit = 0) => dispatch('searchPn', { pn, limit });

export const summarizeEmbeddedPartNumber = pn => dispatch('summary', { pn });

export const decodeEmbeddedFlashId = id => dispatch('decodeId', { id });

export const searchEmbeddedFlashId = (id, limit = 0) => dispatch('searchId', { id, limit });

export const summarizeEmbeddedFlashId = id => dispatch('summaryId', { id });
