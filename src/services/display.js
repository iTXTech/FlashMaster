export const EMPTY_VALUE = '-';

const UNKNOWN_VALUES = new Set(['unknown', '未知', 'n/a', 'na', 'null', 'undefined']);

export function displayValue(value, emptyValue = EMPTY_VALUE) {
    if (value === undefined || value === null) return emptyValue;
    if (typeof value !== 'string') return value;

    const text = value.trim();
    if (!text || UNKNOWN_VALUES.has(text.toLowerCase())) return emptyValue;
    return text;
}
