import store from '@/store';
import {
    decodeEmbeddedFlashId,
    decodeEmbeddedPartNumber,
    getEmbeddedInfo,
    searchEmbeddedFlashId,
    searchEmbeddedPartNumber,
    summarizeEmbeddedFlashId,
    summarizeEmbeddedPartNumber
} from '@/services/fdnextApi';
import { summaryText } from '@/services/fdnextResultView';

const makeUrl = (endpoint, params = {}) => {
    const base = store.getServerAddress().replace(/\/+$/, '');
    const url = new URL(`${base}/${endpoint.replace(/^\/+/, '')}`);
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, value);
        }
    }
    return url.toString();
};

const assertFdnextPayload = (payload, schemaVersion, endpoint) => {
    if (!payload || payload.schemaVersion !== schemaVersion) {
        throw new Error(`Unsupported fdnext response from ${endpoint}`);
    }
    return payload;
};

const request = async (endpoint, params = {}, schemaVersion = 'fdnext.result.v1') => {
    const response = await fetch(makeUrl(endpoint, params));
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
    const payload = await response.json();
    return assertFdnextPayload(payload, schemaVersion, endpoint);
};

const useEmbeddedParser = () => store.isEmbeddedParser();

const langParams = () => ({
    lang: store.getLang()
});

const limitParams = limit => {
    const value = Number(limit);
    return Number.isFinite(value) && value > 0 ? { limit: value } : {};
};

export const getServerInfo = () => useEmbeddedParser()
    ? getEmbeddedInfo()
    : request('capabilities', {}, 'fdnext.capabilities.v1');

export const decodePartNumber = pn => useEmbeddedParser() ? decodeEmbeddedPartNumber(pn) : request('parts/decode', {
    ...langParams(),
    query: pn
});

export const searchPartNumber = (pn, limit = 0) => useEmbeddedParser() ? searchEmbeddedPartNumber(pn, limit) : request('parts/search', {
    ...langParams(),
    query: pn,
    ...limitParams(limit)
});

export const summarizePartNumber = async pn => useEmbeddedParser()
    ? summarizeEmbeddedPartNumber(pn)
    : summaryText(await decodePartNumber(pn));

export const decodeFlashId = id => useEmbeddedParser() ? decodeEmbeddedFlashId(id) : request('identifiers/decode', {
    ...langParams(),
    query: id,
    idScheme: 'nand.flash_id'
});

export const searchFlashId = (id, limit = 0) => useEmbeddedParser() ? searchEmbeddedFlashId(id, limit) : request('identifiers/search', {
    ...langParams(),
    query: id,
    idScheme: 'nand.flash_id',
    ...limitParams(limit)
});

export const summarizeFlashId = async id => useEmbeddedParser()
    ? summarizeEmbeddedFlashId(id)
    : summaryText(await decodeFlashId(id));
