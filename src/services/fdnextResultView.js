import { displayValue } from '@/services/display';

export const FDNEXT_RESULT_SCHEMA_VERSION = 'fdnext.result.v1';
export const FDNEXT_CAPABILITIES_SCHEMA_VERSION = 'fdnext.capabilities.v1';

const EMPTY = '-';

export function isFdnextResult(value) {
  return !!value && value.schemaVersion === FDNEXT_RESULT_SCHEMA_VERSION;
}

export function isFdnextCapabilities(value) {
  return !!value && value.schemaVersion === FDNEXT_CAPABILITIES_SCHEMA_VERSION;
}

export function asArray(value) {
  return Array.isArray(value) ? value.filter(item => item !== undefined && item !== null && item !== '') : [];
}

export function formatValue(value) {
  if (Array.isArray(value)) {
    return value.map(formatValue).filter(item => item !== EMPTY).join(', ') || EMPTY;
  }
  if (value && typeof value === 'object') {
    const text = Object.entries(value)
      .map(([key, item]) => `${key}: ${formatValue(item)}`)
      .filter(Boolean)
      .join(', ');
    return text || EMPTY;
  }
  return displayValue(value, EMPTY);
}

export function formatField(field) {
  if (!field) return EMPTY;
  if (field.display) return displayValue(field.display, EMPTY);
  if (field.unit && typeof field.value !== 'object') {
    return displayValue(`${field.value} ${field.unit}`, EMPTY);
  }
  return formatValue(field.value);
}

export function fieldMetric(field) {
  return {
    key: field.key,
    label: field.label || field.key,
    value: formatField(field),
    importance: field.importance
  };
}

export function fieldRows(fields = []) {
  return asArray(fields).map(field => ({
    key: field.key,
    name: field.label || field.key,
    value: formatField(field),
    importance: field.importance
  }));
}

export function resultBlocks(result) {
  return asArray(result?.blocks).map(block => ({
    id: block.id,
    label: block.label || block.id,
    importance: block.importance || 'detail',
    fields: asArray(block.fields),
    metrics: asArray(block.fields).map(fieldMetric),
    rows: fieldRows(block.fields)
  })).filter(block => block.rows.length > 0);
}

export function primaryBlocks(result) {
  const blocks = resultBlocks(result);
  const primary = blocks.filter(block => block.importance === 'primary');
  return primary.length > 0 ? primary : blocks.slice(0, 1);
}

export function detailBlocks(result) {
  const primaryIds = new Set(primaryBlocks(result).map(block => block.id));
  return resultBlocks(result).filter(block => !primaryIds.has(block.id));
}

export function primaryMetrics(result) {
  return primaryBlocks(result).flatMap(block => block.metrics);
}

export function deviceVendor(device) {
  return device?.vendor?.name || device?.vendor?.id || '';
}

export function deviceTitle(device) {
  return device?.partNumber || device?.identifier || device?.markingCode || '';
}

export function chipLabel(value) {
  return String(value || '').replaceAll('_', ' ');
}

export function resultChips(result) {
  const device = result?.device || {};
  const chips = result?.operation?.startsWith('identifier.')
    ? [device.idScheme]
    : [];
  return [...new Set(chips.filter(Boolean).map(chipLabel))];
}

export function resultHeader(result) {
  const device = result?.device || {};
  return {
    vendor: deviceVendor(device),
    title: deviceTitle(device) || result?.input?.normalized || result?.input?.query || '',
    subtitle: result?.subtitle || '',
    chips: resultChips(result),
    status: result?.status || '',
    device
  };
}

export function warnings(result) {
  return asArray(result?.warnings).map(item => ({
    code: item.code,
    message: item.message || item.code,
    severity: item.severity || 'warning'
  }));
}

export function actionRoute(action) {
  const input = action?.input || {};
  const query = input.query;
  if (!query) return null;
  if (action.operation === 'part.decode') return { path: '/decode', query: { pn: query } };
  if (action.operation === 'part.search') return { path: '/searchPn', query: { pn: query } };
  if (action.operation === 'identifier.decode') return { path: '/decodeId', query: { id: query } };
  if (action.operation === 'identifier.search') return { path: '/searchId', query: { id: query } };
  return null;
}

function endpointLabel(endpoint = {}) {
  return endpoint.label
    || endpoint.partNumber
    || endpoint.identifier
    || endpoint.markingCode
    || deviceTitle(endpoint.device)
    || deviceVendor(endpoint.device)
    || '';
}

export function relationRows(result) {
  return asArray(result?.relations).map((relation, index) => {
    const action = relation.action;
    const target = relation.target || {};
    const source = relation.source || {};
    const targetText = endpointLabel(target);
    const sourceText = endpointLabel(source);
    return {
      key: `${relation.kind}-${targetText}-${index}`,
      kind: chipLabel(relation.kind),
      label: relation.label || action?.label || chipLabel(relation.kind),
      source: sourceText,
      target: targetText,
      value: [sourceText, targetText].filter(Boolean).join(' -> ') || targetText || sourceText,
      fields: fieldRows(relation.fields),
      actionLabel: action?.label || '',
      route: actionRoute(action),
      operation: action?.operation || ''
    };
  });
}

export function findField(fields = [], key) {
  return asArray(fields).find(field => field.key === key);
}

export function fieldText(fields = [], key) {
  return formatField(findField(fields, key));
}

function relationParts(relations = []) {
  return asArray(relations)
    .map(relation => relation.target?.partNumber || relation.source?.partNumber || relation.action?.input?.query)
    .filter(Boolean);
}

export function partSearchRows(result) {
  return asArray(result?.items).map((item, index) => {
    const device = item.device || {};
    const partNumber = device.partNumber || item.label;
    const markingCode = device.markingCode || '';
    const route = partNumber ? { path: '/decode', query: { pn: partNumber } } : null;
    return {
      key: `${partNumber || item.label}-${index}`,
      vendor: deviceVendor(device),
      pn: partNumber,
      label: item.label || partNumber,
      markingCode,
      badges: asArray(item.badges).length
        ? asArray(item.badges)
        : [device.chipKind, device.productType].filter(Boolean).map(chipLabel),
      fields: fieldRows(item.fields),
      fieldSummary: fieldRows(item.fields).map(row => `${row.name}: ${row.value}`).join(' · '),
      route,
      chipKind: chipLabel(device.chipKind),
      productType: chipLabel(device.productType)
    };
  });
}

export function identifierSearchRows(result) {
  return asArray(result?.items).map((item, index) => {
    const device = item.device || {};
    const id = device.identifier || item.label;
    const fields = asArray(item.fields);
    const controllers = formatField(findField(fields, 'controller')).split(/\s*,\s*/).filter(item => item && item !== EMPTY);
    const partNumberList = relationParts(item.relations);
    return {
      key: `${id}-${index}`,
      id,
      vendor: deviceVendor(device),
      label: item.label || id,
      badges: [device.chipKind, device.idScheme].filter(Boolean).map(chipLabel),
      pageSize: fieldText(fields, 'page_size'),
      blockSize: fieldText(fields, 'block_size'),
      geometry: [
        fieldText(fields, 'page_size') !== EMPTY ? `Page ${fieldText(fields, 'page_size')}` : '',
        fieldText(fields, 'block_size') !== EMPTY ? `Block ${fieldText(fields, 'block_size')}` : ''
      ].filter(Boolean).join(' · '),
      fields: fieldRows(fields).filter(row => row.key !== 'controller'),
      fieldSummary: fieldRows(fields)
        .filter(row => row.key !== 'controller')
        .slice(0, 4)
        .map(row => `${row.name}: ${row.value}`)
        .join(' · '),
      partNumberList,
      partNumbers: partNumberList.join(', '),
      controllerList: controllers,
      controllers: controllers.join(', '),
      route: id ? { path: '/decodeId', query: { id } } : null
    };
  });
}

export function partSuggestions(result) {
  return partSearchRows(result).map(row => ({
    title: [row.vendor, row.markingCode, row.pn].filter(Boolean).join(' / '),
    value: row.markingCode || row.pn,
    subtitle: row.fieldSummary,
    raw: row
  }));
}

export function identifierSuggestions(result) {
  return identifierSearchRows(result).map(row => ({
    title: [row.vendor, row.id].filter(Boolean).join(' / '),
    value: row.id,
    subtitle: row.fieldSummary,
    raw: row
  }));
}

export function summaryText(result) {
  if (!result) return '';
  const header = resultHeader(result);
  const lines = [
    [header.vendor, header.title].filter(Boolean).join(' · '),
    header.subtitle
  ].filter(Boolean);
  for (const block of resultBlocks(result)) {
    if (block.rows.length) {
      lines.push(`[${block.label}]`);
      for (const row of block.rows) {
        lines.push(`${row.name}: ${row.value}`);
      }
    }
  }
  const relations = relationRows(result);
  if (relations.length) {
    lines.push('[Relations]');
    for (const relation of relations) {
      lines.push(`${relation.label}: ${relation.value}`);
    }
  }
  return lines.join('\n');
}
