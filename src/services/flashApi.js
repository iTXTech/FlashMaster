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
import { FDNEXT_CAPABILITIES_SCHEMA_VERSIONS, summaryText } from '@/services/fdnextResultView';

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
    const schemaVersions = Array.isArray(schemaVersion) ? schemaVersion : [schemaVersion];
    if (!payload || !schemaVersions.includes(payload.schemaVersion)) {
        throw new Error(`Unsupported fdnext response from ${endpoint}`);
    }
    return payload;
};

const parseResponsePayload = async response => {
    const text = await response.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
};

const request = async (endpoint, params = {}, schemaVersion = 'fdnext.result.v1') => {
    const response = await fetch(makeUrl(endpoint, params));
    const payload = await parseResponsePayload(response);
    if (payload) {
        try {
            return assertFdnextPayload(payload, schemaVersion, endpoint);
        } catch (err) {
            if (response.ok) throw err;
        }
    }
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    throw new Error(`Unsupported fdnext response from ${endpoint}`);
};

const useEmbeddedParser = () => store.isEmbeddedParser();

const langParams = () => ({
    lang: store.getLang()
});

const limitParams = limit => {
    const value = Number(limit);
    return Number.isFinite(value) && value > 0 ? { limit: value } : {};
};

const controllerGroupParams = () => ({
    controllerGroup: store.getControllerGroupParam()
});

export const getServerInfo = async () => useEmbeddedParser()
    ? getEmbeddedInfo()
    : request('capabilities', langParams(), FDNEXT_CAPABILITIES_SCHEMA_VERSIONS);

export const decodePartNumber = async pn => {
    return useEmbeddedParser() ? decodeEmbeddedPartNumber(pn) : request('parts/decode', {
        ...langParams(),
        ...controllerGroupParams(),
        query: pn
    });
};

export const searchPartNumber = async (pn, limit = 0) => {
    return useEmbeddedParser() ? searchEmbeddedPartNumber(pn, limit) : request('parts/search', {
        ...langParams(),
        query: pn,
        ...controllerGroupParams(),
        ...limitParams(limit)
    });
};

export const summarizePartNumber = async pn => useEmbeddedParser()
    ? summarizeEmbeddedPartNumber(pn)
    : summaryText(await decodePartNumber(pn));

export const decodeFlashId = async id => {
    const input = { idScheme: 'nand.flash_id' };
    return useEmbeddedParser() ? decodeEmbeddedFlashId(id) : request('identifiers/decode', {
        ...langParams(),
        query: id,
        ...input,
        ...controllerGroupParams()
    });
};

export const searchFlashId = async (id, limit = 0) => {
    const input = { idScheme: 'nand.flash_id' };
    return useEmbeddedParser() ? searchEmbeddedFlashId(id, limit) : request('identifiers/search', {
        ...langParams(),
        query: id,
        ...input,
        ...controllerGroupParams(),
        ...limitParams(limit)
    });
};

export const summarizeFlashId = async id => useEmbeddedParser()
    ? summarizeEmbeddedFlashId(id)
    : summaryText(await decodeFlashId(id));
