import { displayValue } from '@/services/display';
import { idRoute, idsSearchRoute, partRoute, partsSearchRoute } from '@/router/locations';
import getVendorLogo, { isVendorLogoDark } from '@/services/vendorLogos';

export const FDNEXT_RESULT_SCHEMA_VERSION = 'fdnext.result.v2';
export const FDNEXT_CAPABILITIES_SCHEMA_VERSION = 'fdnext.capabilities.v2';

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

function isListField(field) {
  return ['controller', 'controllers'].includes(field?.key);
}

function isControllerFieldKey(key) {
  return key === 'controller' || key === 'controllers' || String(key || '').startsWith('controller_');
}

function defaultSearchRows(rows = []) {
  return asArray(rows).filter(row => !isControllerFieldKey(row.key));
}

function compactFieldSummary(rows = [], limit = 4) {
  return defaultSearchRows(rows)
    .slice(0, limit)
    .map(row => `${row.name}: ${row.value}`)
    .join(' · ');
}

function splitListField(field) {
  if (!isListField(field)) return [];
  const source = Array.isArray(field?.value) ? field.value : formatField(field).split(/[,，;；]/);
  return [...new Set(source.map(item => String(item || '').trim()).filter(item => item && item !== EMPTY))];
}

const LINK_CATEGORY_ICONS = {
  vnd: 'mdi-domain',
  ds: 'mdi-file-document-outline',
  mkt: 'mdi-cart-outline',
  ref: 'mdi-book-open-page-variant-outline',
  tl: 'mdi-tools',
  com: 'mdi-account-group-outline',
  ads: 'mdi-information-outline'
};

function isExternalUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return ['http:', 'https:', 'mailto:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function isImageUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function isBundledImageUrl(value) {
  const text = String(value || '').trim();
  return text.startsWith('/') && !text.startsWith('//');
}

function isInlineImageUrl(value) {
  return /^data:image\/(?:svg\+xml|png|jpe?g|webp)(?:[;,])/i.test(String(value || '').trim());
}

function linkImage(image, vendor) {
  const value = String(image || '').trim();
  if (!value) return '';
  if (value.toLowerCase() === 'logo') return getVendorLogo(vendor);
  return isImageUrl(value) || isBundledImageUrl(value) || isInlineImageUrl(value) ? value : '';
}

function linkImageDark(image, vendor) {
  if (String(image || '').trim().toLowerCase() !== 'logo') return false;
  return isVendorLogoDark(vendor);
}

export function externalLinkRows(links = [], vendor = '') {
  return asArray(links)
    .map((link, index) => {
      const url = String(link?.url || '').trim();
      const label = String(link?.label || '').trim();
      if (!url || !label || !isExternalUrl(url)) return null;
      const category = String(link.category || '').trim();
      return {
        key: `${link.id || label}-${url}-${index}`,
        id: link.id || '',
        label,
        url,
        category,
        isAdvertisement: category === 'ads',
        isTechnical: ['ds', 'ref'].includes(category),
        icon: String(link.icon || '').trim() || LINK_CATEGORY_ICONS[category] || 'mdi-open-in-new',
        hint: String(link.hint || '').trim(),
        fieldKey: link.fieldKey || '',
        image: linkImage(link.image || link.img, vendor),
        imageDark: linkImageDark(link.image || link.img, vendor),
        priority: Number.isFinite(Number(link.priority)) ? Number(link.priority) : 0
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.priority - a.priority || a.label.localeCompare(b.label));
}

export function fieldRows(fields = []) {
  return asArray(fields).map(field => {
    const items = splitListField(field);
    return {
      key: field.key,
      name: field.label || field.key,
      value: formatField(field),
      items,
      importance: field.importance
    };
  });
}

export function resultBlocks(result) {
  return asArray(result?.summary?.full).map(block => ({
    id: block.id,
    label: block.label || block.id,
    importance: block.importance || 'detail',
    rows: fieldRows(block.fields)
  })).filter(block => block.rows.length > 0);
}

export function deviceVendor(device) {
  return device?.vendor?.name || device?.vendor?.id || '';
}

export function deviceTitle(device) {
  return device?.partNumber || device?.identifier || device?.markingCode || '';
}

const CHIP_LABELS = {
  raw_nand: 'Raw NAND',
  on_die_ecc_nand: 'On-die ECC NAND',
  managed_nand: 'Managed NAND',
  nand_flash_id: 'NAND Flash ID',
  nand: 'NAND',
  dram: 'DRAM',
  '3d_xpoint': '3D XPoint',
  '3dxpoint': '3D XPoint',
  nor: 'NOR',
  pmic: 'PMIC',
  controller: 'Controller',
  emmc: 'eMMC',
  emcp: 'eMCP',
  umcp: 'uMCP',
  ufs: 'UFS',
  inand: 'iNAND',
  issd: 'iSSD',
  nvme: 'NVMe',
  e2nand: 'E2NAND',
  lpddr4: 'LPDDR4',
  lpddr4x: 'LPDDR4X',
  lpddr5: 'LPDDR5',
  lpddr5x: 'LPDDR5X',
  ddr3: 'DDR3',
  ddr4: 'DDR4',
  ddr5: 'DDR5'
};

function chipLabelKey(value) {
  return String(value || '')
    .trim()
    .replaceAll('.', '_')
    .replaceAll(/[\s-]+/g, '_')
    .toLowerCase();
}

export function chipLabel(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return CHIP_LABELS[chipLabelKey(text)] || text.replaceAll('_', ' ');
}

export function resultHeader(result) {
  const device = result?.device || {};
  return {
    vendor: deviceVendor(device),
    title: deviceTitle(device) || result?.input?.normalized || result?.input?.query || '',
    subtitle: result?.subtitle || '',
    status: result?.status || '',
    device,
    marking: device.markingCode || '',
    input: result?.input?.query || '',
    kind: chipLabel(device.productType || device.chipKind)
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
  if (action.operation === 'part.decode') return partRoute(query);
  if (action.operation === 'part.search') return partsSearchRoute(query);
  if (action.operation === 'identifier.decode') return idRoute(query);
  if (action.operation === 'identifier.search') return idsSearchRoute(query);
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

function relationKindLabel(kind) {
  if (kind === 'identifier_for') return '';
  return chipLabel(kind);
}

function relationDisplayLabel(relation, action, kindLabel) {
  if (relation.kind === 'identifier_for') {
    const label = action?.label || relation.label || kindLabel;
    return label === 'identifier for' ? '' : label;
  }
  const label = relation.label || action?.label || kindLabel;
  return label === 'identifier for' ? '' : label;
}

export function relationRows(result) {
  const defaultOperation = result?.operation === 'part.decode' ? 'identifier.decode'
    : result?.operation === 'identifier.decode' ? 'part.decode' : '';
  return asArray(result?.relations).map((relation, index) => {
    const action = relation.action;
    const target = relation.target || {};
    const source = relation.source || {};
    const targetText = endpointLabel(target);
    const sourceText = endpointLabel(source);
    const kindLabel = relationKindLabel(relation.kind);
    return {
      key: `${relation.kind}-${targetText}-${index}`,
      isDefaultNavigation: !!defaultOperation && relation.kind === 'identifier_for' && action?.operation === defaultOperation,
      kind: kindLabel,
      label: relationDisplayLabel(relation, action, kindLabel),
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

function normalizeBadge(value) {
  return String(value || '').replace(/\s+/g, '').toLowerCase();
}

function displayBadges(badges, vendor) {
  const vendorKey = normalizeBadge(vendor);
  const vendorText = String(vendor || '').trim();
  const normalizedBadges = asArray(badges)
    .map(badge => {
      const text = String(badge || '').trim();
      if (normalizeBadge(text) === vendorKey) return '';
      if (vendorText && text.toLowerCase().startsWith(vendorText.toLowerCase())) {
        return chipLabel(text.slice(vendorText.length).replace(/^[\s./·|-]+/, '').trim());
      }
      return chipLabel(text);
    })
    .filter(Boolean);
  return [...new Set(normalizedBadges)];
}

export function partSearchRows(result) {
  return asArray(result?.items).map(partSearchRow);
}

export function partSearchRow(item, index = 0) {
  const device = item.device || {};
  const partNumber = device.partNumber || item.label;
  const markingCode = device.markingCode || '';
  const vendor = deviceVendor(device);
  const badges = asArray(item.badges).length
    ? asArray(item.badges)
    : [device.chipKind, device.productType].filter(Boolean).map(chipLabel);
  const route = partNumber ? partRoute(partNumber) : null;
  const rows = fieldRows(item.fields);
  const fieldSummary = compactFieldSummary(rows);
  return {
    key: `${partNumber || item.label}-${index}`,
    vendor,
    pn: partNumber,
    label: item.label || partNumber,
    markingCode,
    badges: displayBadges(badges, vendor),
    fields: rows,
    fieldSummary,
    links: externalLinkRows(item.links, vendor),
    route,
    chipKind: chipLabel(device.chipKind),
    productType: chipLabel(device.productType)
  };
}

export function identifierSearchRows(result) {
  return asArray(result?.items).map(identifierSearchRow);
}

export function identifierSearchRow(item, index = 0) {
  const device = item.device || {};
  const id = device.identifier || item.label;
  const fields = asArray(item.fields);
  const controllers = splitListField(findField(fields, 'controller'));
  const partNumberList = relationParts(item.relations);
  const vendor = deviceVendor(device);
  const rows = fieldRows(fields);
  return {
    key: `${id}-${index}`,
    id,
    vendor,
    label: item.label || id,
    badges: [device.chipKind, device.idScheme].filter(Boolean).map(chipLabel),
    pageSize: fieldText(fields, 'page_size'),
    blockSize: fieldText(fields, 'block_size'),
    geometry: [
      fieldText(fields, 'page_size') !== EMPTY ? `Page ${fieldText(fields, 'page_size')}` : '',
      fieldText(fields, 'block_size') !== EMPTY ? `Block ${fieldText(fields, 'block_size')}` : ''
    ].filter(Boolean).join(' · '),
    fields: defaultSearchRows(rows),
    fieldSummary: compactFieldSummary(rows),
    partNumberList,
    partNumbers: partNumberList.join(', '),
    controllerList: controllers,
    controllers: controllers.join(', '),
    links: externalLinkRows(item.links, vendor),
    route: id ? idRoute(id) : null
  };
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

export function summaryText(result, mode = 'brief') {
  if (!result) return '';
  const labels = result.input?.lang === 'chs'
    ? { input: '输入', marking: '丝印', status: '状态', relations: '关联数据', warnings: '提示', candidates: '候选料号', controllers: '数据库控制器记录', count: '项' }
    : { input: 'Input', marking: 'Marking', status: 'Status', relations: 'Related data', warnings: 'Warnings', candidates: 'Candidate parts', controllers: 'Database controller records', count: 'items' };
  const header = resultHeader(result);
  const lines = [[header.vendor, header.title, header.kind].filter(Boolean).join(' · ')];
  if (header.marking && header.marking !== header.title) lines.push(`${labels.marking}: ${header.marking}`);
  if (header.input && ![header.title, header.marking].includes(header.input)) lines.push(`${labels.input}: ${header.input}`);
  if (header.status && header.status !== 'ok') lines.push(`${labels.status}: ${header.status}`);
  if (mode === 'full') {
    for (const block of resultBlocks(result)) {
      lines.push(`[${block.label}]`, ...block.rows.map(row => `${row.name}: ${row.value}`));
    }
  } else {
    const rows = fieldRows(result.summary?.brief);
    for (let index = 0; index < rows.length; index += 3) {
      lines.push(rows.slice(index, index + 3).map(row => `${row.name}: ${row.value}`).join(' | '));
    }
    const controllers = resultBlocks(result).flatMap(block => block.rows).filter(row => isControllerFieldKey(row.key));
    const count = new Set(controllers.flatMap(row => row.items.length ? row.items : [row.value])).size;
    if (count) lines.push(`${labels.controllers}: ${count} ${labels.count}`);
  }
  const relations = relationRows(result);
  if (relations.length) {
    lines.push(`[${labels.relations}]`);
    for (const relation of mode === 'full' ? relations : relations.slice(0, 3)) {
      lines.push([relation.label, relation.value].filter(Boolean).join(': '));
      if (mode === 'full') lines.push(...relation.fields.map(row => `${row.name}: ${row.value}`));
    }
    if (mode !== 'full' && relations.length > 3) lines.push(`${labels.relations}: ${relations.length} ${labels.count}`);
  }
  for (const candidate of asArray(result.candidates)) {
    lines.push(`${labels.candidates}: ${deviceTitle(candidate.device)}`);
    if (mode === 'full') lines.push(...fieldRows(candidate.fields).map(row => `${row.name}: ${row.value}`));
    for (const warning of asArray(candidate.warnings)) lines.push(`${labels.warnings}: ${warning.message || warning.code}`);
  }
  for (const warning of warnings(result)) lines.push(`${labels.warnings}: ${warning.message}`);
  return lines.filter(Boolean).join('\n');
}

export function technicalLinksText(result) {
  return externalLinkRows(result?.links, deviceVendor(result?.device))
    .filter(link => link.isTechnical && !link.isAdvertisement)
    .map(link => {
      const url = new URL(link.url);
      for (const key of [...url.searchParams.keys()]) {
        if (/^utm_/i.test(key)) url.searchParams.delete(key);
      }
      return `${link.label}: ${url.toString()}`;
    }).join('\n');
}

export function specificationRows(rows = [], { compactLabels = false } = {}) {
  return rows.map(row => {
    const label = compactLabels ? row.name.replace(/^DRAM\s*/i, '') : row.name;
    const width = [...String(row.value)].reduce((sum, char) => sum + (char.codePointAt(0) > 0x7f ? 2 : 1), 0);
    return {
      ...row,
      label,
      mobileLong: width > 12,
      long: width > 24 || String(row.value).includes('\n') || row.items?.length > 0
    };
  });
}
