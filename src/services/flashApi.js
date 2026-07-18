import store from '@/store';
import {
    decodeEmbeddedFlashId,
    decodeEmbeddedPartNumber,
    getEmbeddedInfo,
    searchEmbeddedFlashId,
    searchEmbeddedPartNumber,
    warmEmbeddedParser as warmEmbeddedFdnextParser
} from '@/services/fdnextApi';
import { FDNEXT_CAPABILITIES_SCHEMA_VERSIONS, summaryText } from '@/services/fdnextResultView';
import { DEFAULT_HTTP_REQUEST_TIMEOUT_MS, runWithRequestTimeout } from '@/services/requestControl';

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

const request = async (endpoint, params = {}, schemaVersion = 'fdnext.result.v1', options = {}) => {
    return runWithRequestTimeout(async signal => {
        const response = await fetch(makeUrl(endpoint, params), { signal });
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
    }, {
        signal: options.signal,
        timeoutMs: options.timeoutMs ?? DEFAULT_HTTP_REQUEST_TIMEOUT_MS,
        timeoutMessage: `Request to ${endpoint} timed out.`
    });
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

export const getServerInfo = async (options = {}) => useEmbeddedParser()
    ? getEmbeddedInfo()
    : request('capabilities', langParams(), FDNEXT_CAPABILITIES_SCHEMA_VERSIONS, options);

export const warmEmbeddedParser = () => {
    if (!useEmbeddedParser()) return Promise.resolve();
    return warmEmbeddedFdnextParser();
};

export const decodePartNumber = async (pn, options = {}) => {
    return useEmbeddedParser() ? decodeEmbeddedPartNumber(pn) : request('parts/decode', {
        ...langParams(),
        ...controllerGroupParams(),
        query: pn
    }, 'fdnext.result.v1', options);
};

export const searchPartNumber = async (pn, limit = 0, options = {}) => {
    return useEmbeddedParser() ? searchEmbeddedPartNumber(pn, limit) : request('parts/search', {
        ...langParams(),
        query: pn,
        ...limitParams(limit)
    }, 'fdnext.result.v1', options);
};

export const summarizePartNumber = async (pn, options = {}) => summaryText(await decodePartNumber(pn, options));

export const decodeFlashId = async (id, options = {}) => {
    const input = { idScheme: 'nand.flash_id' };
    return useEmbeddedParser() ? decodeEmbeddedFlashId(id) : request('identifiers/decode', {
        ...langParams(),
        query: id,
        ...input,
        ...controllerGroupParams()
    }, 'fdnext.result.v1', options);
};

export const searchFlashId = async (id, limit = 0, options = {}) => {
    const input = { idScheme: 'nand.flash_id' };
    return useEmbeddedParser() ? searchEmbeddedFlashId(id, limit) : request('identifiers/search', {
        ...langParams(),
        query: id,
        ...input,
        ...limitParams(limit)
    }, 'fdnext.result.v1', options);
};

export const summarizeFlashId = async (id, options = {}) => summaryText(await decodeFlashId(id, options));
