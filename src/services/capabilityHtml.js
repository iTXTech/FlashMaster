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

function formatDecoderItem(item) {
  const meta = item.priority !== undefined ? `P${item.priority}` : '';
  return `
    <div class="capability-list-item">
      <span>${escapeHtml(item.id || '-')}</span>
      ${meta ? `<em>${escapeHtml(meta)}</em>` : ''}
    </div>
  `;
}

function formatDecoderGroup(key, title, items = [], expandedDecoderGroups, t) {
  const list = Array.isArray(items) ? items : [];
  const expanded = Boolean(expandedDecoderGroups[key]);
  const visible = expanded ? list : list.slice(0, 4);
  const hiddenCount = Math.max(0, list.length - visible.length);
  return `
    <div class="capability-list-group${expanded ? ' capability-list-group--expanded' : ''}">
      <div class="capability-list-title">
        <span>${escapeHtml(title)}</span>
        <em>${escapeHtml(formatCount(list.length))}</em>
      </div>
      <div class="capability-list">
        ${visible.length ? visible.map(formatDecoderItem).join('') : '-'}
        ${list.length > 8 ? `
          <button class="capability-list-more" type="button" data-decoder-group="${escapeAttr(key)}">
            ${expanded
              ? escapeHtml(t('settings.capabilityInfo.collapse'))
              : escapeHtml(t('settings.capabilityInfo.more', [formatCount(hiddenCount)]))}
          </button>
        ` : ''}
      </div>
    </div>
  `;
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

export function formatServerInfo(data, t, expandedDecoderGroups = {}) {
  if (data?.schemaVersion === 'fdnext.capabilities.v1') {
    return formatFdnextCapabilities(data, t, expandedDecoderGroups);
  }
  return escapeHtml(JSON.stringify(data, null, 2)).replace(/\n/g, '<br/>');
}

export function formatFdnextCapabilities(data, t, expandedDecoderGroups = {}) {
  const inventory = data.inventory || {};
  const partNumbers = inventory.partNumbers || {};
  const micronFbga = inventory.micronFbga || {};
  const decoders = data.decoders || {};
  const capabilities = Array.isArray(data.capabilities) ? data.capabilities : [];

  return `
    <div class="capability-info">
      <div class="capability-card-grid">
        ${formatInfoCard(t('settings.capabilityInfo.parser'), [
          [t('settings.capabilityInfo.name'), data.server?.name],
          [t('settings.capabilityInfo.version'), data.server?.version],
          [t('settings.capabilityInfo.commitHash'), data.server?.build?.commitHash],
          [t('settings.capabilityInfo.buildTime'), data.server?.build?.buildTime],
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
      <section class="capability-card">
        <div class="capability-card-title">${escapeHtml(t('settings.capabilityInfo.capabilities'))}</div>
        <div class="capability-op-list">${capabilities.length ? capabilities.map(item => formatCapability(item, t)).join('') : '-'}</div>
      </section>
      <section class="capability-card">
        <div class="capability-card-title">${escapeHtml(t('settings.capabilityInfo.decoders'))}</div>
        <div class="capability-list-grid">
          ${formatDecoderGroup('partNumber', t('settings.capabilityInfo.partNumberDecoders'), decoders.partNumber, expandedDecoderGroups, t)}
          ${formatDecoderGroup('identifier', t('settings.capabilityInfo.identifierDecoders'), decoders.identifier, expandedDecoderGroups, t)}
        </div>
      </section>
    </div>
  `;
}

export function decoderGroupFromEvent(event) {
  return event.target?.closest?.('[data-decoder-group]')?.getAttribute('data-decoder-group') || '';
}
