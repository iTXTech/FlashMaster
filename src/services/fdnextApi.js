import { createEngine } from '@itxtech/fdnext-core';
import {
  compileFlashIdRulesToDecoders,
  compileRulesToDecoders,
  defaultDslRules,
  defaultFlashIdRules
} from '@itxtech/fdnext-dsl';
import fdbRaw from '../../vendor/fdnext/resources/fdb.json';
import mdbRaw from '../../vendor/fdnext/resources/mdb.json';
import chsLang from '../../vendor/fdnext/resources/lang/chs.json';
import engLang from '../../vendor/fdnext/resources/lang/eng.json';
import store from '@/store';

let engine;

function getEngine() {
  if (!engine) {
    engine = createEngine({
      resources: {
        fdbRaw,
        mdbRaw,
        langRaw: {
          chs: chsLang,
          eng: engLang
        }
      },
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
