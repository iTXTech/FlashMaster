import { chipLabel } from '@/services/fdnextResultView';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function present(value, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function formatCount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString() : present(value);
}

function formatKeyValueRows(rows) {
  return rows
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    .map(([label, value]) => `
      <div class="capability-kv-row">
        <dt>${escapeHtml(label)}</dt>
        <dd>${escapeHtml(value)}</dd>
      </div>
    `)
    .join('');
}

function formatInfoCard(title, rows) {
  return `
    <section class="capability-card">
      <div class="capability-card-title">${escapeHtml(title)}</div>
      <dl class="capability-kv-list">${formatKeyValueRows(rows)}</dl>
    </section>
  `;
}

function formatInventoryMetric(label, value) {
  return `
    <div class="capability-metric">
      <div class="capability-metric-label">${escapeHtml(label)}</div>
      <div class="capability-metric-value">${escapeHtml(formatCount(value))}</div>
    </div>
  `;
}

function formatListItem(label, meta = '') {
  return `
    <div class="capability-list-item">
      <span>${escapeHtml(label || '-')}</span>
      ${meta ? `<em>${escapeHtml(meta)}</em>` : ''}
    </div>
  `;
}

function formatDecoderItem(item) {
  return formatListItem(item.id || '-', item.priority !== undefined ? `P${item.priority}` : '');
}

function formatTextItem(item) {
  return formatListItem(item);
}

function formatListGroup(key, title, items = [], expandedCapabilityGroups, t, formatter = formatTextItem, options = {}) {
  const list = Array.isArray(items) ? items : [];
  const collapsedLimit = Number.isFinite(options.collapsedLimit) ? options.collapsedLimit : 4;
  const count = Number.isFinite(options.count) ? options.count : list.length;
  const expanded = Boolean(expandedCapabilityGroups[key]);
  const visible = expanded ? list : list.slice(0, collapsedLimit);
  const hiddenCount = Math.max(0, count - visible.length);
  return `
    <div class="capability-list-group${expanded ? ' capability-list-group--expanded' : ''}">
      <div class="capability-list-title">
        <span>${escapeHtml(title)}</span>
        <em>${escapeHtml(formatCount(count))}</em>
      </div>
      <div class="capability-list">
        ${visible.length ? visible.map(formatter).join('') : '-'}
        ${list.length > collapsedLimit ? `
          <button class="capability-list-more" type="button" data-capability-group="${escapeAttr(key)}">
            ${expanded
              ? escapeHtml(t('settings.capabilityInfo.collapse'))
              : escapeHtml(t('settings.capabilityInfo.more', [formatCount(hiddenCount)]))}
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

function formatDecoderGroup(key, title, items = [], expandedCapabilityGroups, t) {
  return formatListGroup(key, title, items, expandedCapabilityGroups, t, formatDecoderItem);
}

function controllerGroupTitle(group) {
  if (group && typeof group === 'object') {
    return present(group.title || group.id);
  }
  return present(group);
}

function findControllerGroup(controllers, id) {
  const groups = Array.isArray(controllers?.groups) ? controllers.groups : [];
  return groups.find(group => group?.id === id);
}

function formatControllerGroupSelection(value, controllers) {
  if (value === 'all') return controllerGroupTitle(findControllerGroup(controllers, 'all') || 'all');
  const groups = Array.isArray(value) ? value : [];
  return groups.length
    ? groups.map(item => controllerGroupTitle(findControllerGroup(controllers, item) || item)).join(', ')
    : '';
}

function normalizeControllerItems(items = []) {
  return Array.isArray(items)
    ? items.map(item => String(item ?? '').trim()).filter(Boolean)
    : [];
}

function formatControllerChip(item) {
  return `<span class="capability-controller-chip">${escapeHtml(item)}</span>`;
}

function formatControllerGroup(group, t, expandedCapabilityGroups) {
  const id = String(group?.id || '');
  const items = normalizeControllerItems(group?.items);
  const rawCount = Number(group?.count);
  const count = Number.isFinite(rawCount) ? rawCount : items.length;
  const expanded = Boolean(expandedCapabilityGroups[`controller:${id}`]);
  const collapsedLimit = 10;
  const visible = expanded ? items : items.slice(0, collapsedLimit);
  const hiddenCount = Math.max(0, count - visible.length);
  return `
    <div class="capability-controller-group${expanded ? ' capability-controller-group--expanded' : ''}">
      <div class="capability-controller-group-head">
        <strong>${escapeHtml(controllerGroupTitle(group))}</strong>
        <span>${escapeHtml(formatCount(count))}</span>
      </div>
      ${group.description ? `<div class="capability-controller-group-description">${escapeHtml(group.description)}</div>` : ''}
      <div class="capability-controller-chip-grid">
        ${visible.length ? visible.map(formatControllerChip).join('') : '-'}
      </div>
      ${items.length > collapsedLimit ? `
        <button class="capability-list-more" type="button" data-capability-group="${escapeAttr(`controller:${id}`)}">
          ${expanded
            ? escapeHtml(t('settings.capabilityInfo.collapse'))
            : escapeHtml(t('settings.capabilityInfo.more', [formatCount(hiddenCount)]))}
        </button>
      ` : ''}
    </div>
  `;
}

function formatFlatControllerInventory(items, t, expandedCapabilityGroups) {
  return formatListGroup(
    'controller:all',
    'all',
    items.sort((a, b) => a.localeCompare(b)),
    expandedCapabilityGroups,
    t,
    formatTextItem,
    { collapsedLimit: 24 }
  );
}

function formatControllerDefaults(controllers, t) {
  const defaultGroups = formatControllerGroupSelection(controllers?.defaultGroups, controllers);
  if (!defaultGroups) return '';
  return `
    <dl class="capability-kv-list capability-controller-defaults">
      ${formatKeyValueRows([[t('settings.capabilityInfo.defaultControllerGroups'), defaultGroups]])}
    </dl>
  `;
}

function formatControllerInventory(controllers, t, expandedCapabilityGroups) {
  const groups = Array.isArray(controllers?.groups)
    ? controllers.groups.filter(group => group && typeof group === 'object')
    : [];
  const items = normalizeControllerItems(controllers?.items);
  if (!groups.length && !items.length) return '';

  const body = groups.length
    ? `<div class="capability-list-grid capability-controller-grid">
        ${groups.map(group => formatControllerGroup(group, t, expandedCapabilityGroups)).join('')}
      </div>`
    : formatFlatControllerInventory(items, t, expandedCapabilityGroups);

  return `
    <section class="capability-card">
      <div class="capability-card-title">${escapeHtml(t('settings.capabilityInfo.controllerInventory'))}</div>
      <div class="capability-card-note">${escapeHtml(t('settings.capabilityInfo.controllerGroupNote'))}</div>
      ${formatControllerDefaults(controllers, t)}
      ${body}
    </section>
  `;
}

function formatSelectedControllerGroups(selectedControllerGroups, controllers) {
  const selection = Array.isArray(selectedControllerGroups) ? selectedControllerGroups : [];
  if (!selection.length || selection.includes('all')) {
    return controllerGroupTitle(findControllerGroup(controllers, 'all') || 'all');
  }
  return selection.map(item => controllerGroupTitle(findControllerGroup(controllers, item) || item)).join(', ');
}


function formatCapabilityTitle(item, t) {
  const name = item.name || '';
  if (name === 'part.decode') return t('settings.capabilityInfo.partDecode');
  if (name === 'part.search') return t('settings.capabilityInfo.partSearch');
  if (name === 'identifier.decode.nand.flash_id') return t('settings.capabilityInfo.flashIdDecode');
  if (name === 'identifier.search.nand.flash_id') return t('settings.capabilityInfo.flashIdSearch');
  if (name === 'marking.lookup.micron.fbga') return t('settings.capabilityInfo.micronFbgaLookup');
  return name || item.operation || '-';
}

function formatSupportLine(label, values = [], formatter = value => value) {
  const items = values.filter(Boolean);
  if (!items.length) return '';
  return `
    <div class="capability-support-row">
      <span>${escapeHtml(label)}</span>
      <div class="capability-tags">${items.map(item => `<code>${escapeAttr(formatter(item))}</code>`).join('')}</div>
    </div>
  `;
}

function formatCapability(item, t) {
  return `
    <div class="capability-op">
      <div class="capability-op-head">
        <strong>${escapeHtml(formatCapabilityTitle(item, t))}</strong>
        ${item.operation ? `<span>${escapeHtml(item.operation)}</span>` : ''}
      </div>
      <div class="capability-support">
        ${formatSupportLine(t('settings.capabilityInfo.domain'), item.domains || [])}
        ${formatSupportLine(t('settings.capabilityInfo.chipKind'), item.chipKinds || [], chipLabel)}
        ${formatSupportLine(t('settings.capabilityInfo.productType'), item.productTypes || [], chipLabel)}
        ${formatSupportLine(t('settings.capabilityInfo.idScheme'), item.idSchemes || [], chipLabel)}
      </div>
      ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}
    </div>
  `;
}

export function formatServerInfo(data, t, expandedCapabilityGroups = {}, options = {}) {
  if (String(data?.schemaVersion || '').startsWith('fdnext.capabilities.')) {
    return formatFdnextCapabilities(data, t, expandedCapabilityGroups, options);
  }
  return escapeHtml(JSON.stringify(data, null, 2)).replace(/\n/g, '<br/>');
}

export function formatFdnextCapabilities(data, t, expandedCapabilityGroups = {}, options = {}) {
  const inventory = data.inventory || {};
  const partNumbers = inventory.partNumbers || {};
  const micronFbga = inventory.micronFbga || {};
  const decoders = data.decoders || {};
  const capabilities = Array.isArray(data.capabilities) ? data.capabilities : [];
  const controllerGroupSelection = formatSelectedControllerGroups(options.selectedControllerGroups, inventory.controllers);

  return `
    <div class="capability-info">
      <div class="capability-card-grid">
        ${formatInfoCard(t('settings.capabilityInfo.parser'), [
          [t('settings.capabilityInfo.name'), data.server?.name],
          [t('settings.capabilityInfo.version'), data.server?.version],
          [t('settings.capabilityInfo.commitHash'), data.server?.build?.commitHash],
          [t('settings.capabilityInfo.buildTime'), data.server?.build?.buildTime],
          [t('settings.capabilityInfo.selectedControllerGroups'), controllerGroupSelection],
          [t('settings.capabilityInfo.schema'), data.schemaVersion]
        ])}
        ${formatInfoCard(t('settings.capabilityInfo.database'), [
          [t('settings.capabilityInfo.name'), data.fdb?.name],
          [t('settings.capabilityInfo.version'), data.fdb?.version],
          [t('settings.capabilityInfo.generated'), data.fdb?.time],
          [t('settings.capabilityInfo.website'), data.fdb?.website]
        ])}
      </div>
      <section class="capability-card">
        <div class="capability-card-title">${escapeHtml(t('settings.capabilityInfo.inventory'))}</div>
        <div class="capability-metric-grid">
          ${formatInventoryMetric(t('settings.capabilityInfo.controllers'), inventory.controllers?.count)}
          ${formatInventoryMetric(t('settings.capabilityInfo.flashIds'), inventory.flashIds?.count)}
          ${formatInventoryMetric(t('settings.capabilityInfo.partNumbers'), partNumbers.total)}
          ${formatInventoryMetric(t('settings.capabilityInfo.fdbPartNumbers'), partNumbers.fdb)}
          ${formatInventoryMetric(t('settings.capabilityInfo.managedNand'), partNumbers.managedNand)}
          ${formatInventoryMetric(t('settings.capabilityInfo.dram'), partNumbers.dram)}
          ${formatInventoryMetric(t('settings.capabilityInfo.micronFbga'), micronFbga.total)}
          ${formatInventoryMetric(t('settings.capabilityInfo.dramLookup'), micronFbga.dramLookup)}
        </div>
      </section>
      ${formatControllerInventory(inventory.controllers, t, expandedCapabilityGroups)}
      <section class="capability-card">
        <div class="capability-card-title">${escapeHtml(t('settings.capabilityInfo.capabilities'))}</div>
        <div class="capability-op-list">${capabilities.length ? capabilities.map(item => formatCapability(item, t)).join('') : '-'}</div>
      </section>
      <section class="capability-card">
        <div class="capability-card-title">${escapeHtml(t('settings.capabilityInfo.decoders'))}</div>
        <div class="capability-list-grid">
          ${formatDecoderGroup('decoder:partNumber', t('settings.capabilityInfo.partNumberDecoders'), decoders.partNumber, expandedCapabilityGroups, t)}
          ${formatDecoderGroup('decoder:identifier', t('settings.capabilityInfo.identifierDecoders'), decoders.identifier, expandedCapabilityGroups, t)}
        </div>
      </section>
    </div>
  `;
}

export function capabilityGroupFromEvent(event) {
  const target = event.target;
  return target?.closest?.('[data-capability-group]')?.getAttribute('data-capability-group')
    || target?.closest?.('[data-decoder-group]')?.getAttribute('data-decoder-group')
    || '';
}

export const decoderGroupFromEvent = capabilityGroupFromEvent;
