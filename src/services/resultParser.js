function normalizeToken(value) {
    return String(value || '').toUpperCase().replace(/\s+/g, '');
}

function choosePartNumberIndex(parts, query = '') {
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
    const partNumber = parts[partNumberIndex] || String(raw || '');
    const remark = parts
        .filter((_, index) => index !== 0 && index !== partNumberIndex)
        .join(' ');
    return {
        vendor: parts[0] || '',
        value: partNumber,
        remark
    };
}

export function parsePartNumberResult(raw, query = '') {
    const parsed = splitResultLine(raw, query);
    return {
        vendor: parsed.vendor,
        pn: parsed.value,
        remark: parsed.remark
    };
}

export function parsePartNumberSuggestion(raw, query = '') {
    const parsed = parsePartNumberResult(raw, query);
    return {
        title: [parsed.vendor, parsed.pn].filter(Boolean).join(' / '),
        subtitle: parsed.remark,
        value: parsed.pn
    };
}

export function parsePartNumberToken(raw) {
    return splitResultLine(raw).value;
}
