function normalizeToken(value) {
    return String(value || '').toUpperCase().replace(/\s+/g, '');
}

function isShortCodeToken(value) {
    return /^[0-9A-Z]{5}$/.test(normalizeToken(value));
}

function choosePartNumberIndex(parts, query = '') {
    const shortCodeIndex = parts.findIndex((part, index) => index > 0 && isShortCodeToken(part));
    if (shortCodeIndex > 0) {
        const afterCode = parts.findIndex((part, index) => index > shortCodeIndex && !isShortCodeToken(part));
        if (afterCode > 0) return afterCode;
    }

    const normalizedQuery = normalizeToken(query);
    if (normalizedQuery) {
        const hit = parts.findIndex((part, index) => index > 0 && normalizeToken(part).includes(normalizedQuery));
        if (hit > 0) return hit;
    }
    return parts.length > 1 ? 1 : 0;
}

export function splitResultLine(raw, query = '') {
    const parts = String(raw || '').trim().split(/\s+/).filter(Boolean);
    const partNumberIndex = choosePartNumberIndex(parts, query);
    const shortCodeIndex = parts.findIndex((part, index) => index > 0 && index !== partNumberIndex && isShortCodeToken(part));
    const partNumber = parts[partNumberIndex] || String(raw || '');
    const remark = parts
        .filter((_, index) => index !== 0 && index !== partNumberIndex && index !== shortCodeIndex)
        .join(' ');
    return {
        vendor: parts[0] || '',
        value: partNumber,
        remark,
        shortCode: shortCodeIndex > 0 ? parts[shortCodeIndex] : ''
    };
}

export function parsePartNumberResult(raw, query = '') {
    const parsed = splitResultLine(raw, query);
    return {
        vendor: parsed.vendor,
        pn: parsed.value,
        remark: parsed.remark,
        shortCode: parsed.shortCode
    };
}

export function parsePartNumberSuggestion(raw, query = '') {
    const parsed = parsePartNumberResult(raw, query);
    return {
        title: [parsed.vendor, parsed.shortCode, parsed.pn].filter(Boolean).join(' / '),
        subtitle: parsed.remark,
        value: parsed.shortCode || parsed.pn,
        shortCode: parsed.shortCode
    };
}

export function parsePartNumberToken(raw) {
    return splitResultLine(raw).value;
}
