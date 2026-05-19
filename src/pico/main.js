import './style.css';

const DEFAULT_SERVER = String(__FLASHMASTER_LOCKED_SERVER__ || '').trim() || import.meta.env.VITE_FLASHMASTER_SERVER || 'https://fdnext.itxtech.org';
const VERSION_TEXT = typeof VERSION !== 'undefined' ? VERSION : 'dev';
const FDNEXT_TEXT = typeof __FDNEXT_VERSION__ !== 'undefined' ? __FDNEXT_VERSION__ : 'HTTP';
const LOCKED_SERVER = Boolean(String(__FLASHMASTER_LOCKED_SERVER__ || '').trim());

const t = {
  chs: {
    tagline: '存储芯片智能解析平台',
    parts: '料号',
    partSearch: '料号搜索',
    ids: 'ID',
    idSearch: 'ID 搜索',
    settings: '设置',
    about: '关于',
    query: '查询',
    search: '搜索',
    copy: '复制',
    clear: '清空',
    input: '输入',
    result: '结果',
    noData: '暂无数据',
    server: '服务器',
    controllerGroup: '控制器分组',
    lang: '语言',
    theme: '主题',
    dark: '深色',
    light: '浅色',
    system: '系统',
    saved: '已保存',
    failed: '请求失败',
    loading: '查询中...',
    serverInfo: '服务器信息',
    resetStats: '重置统计',
    stats: '统计',
    httpOnly: 'HTTP-only pico 构建',
    aboutText: '轻量单文件版本，保留 HTTP 查询和搜索功能，移除内嵌解析器和完整工作站界面。'
  },
  eng: {
    tagline: 'Memory Chip Intelligence Platform',
    parts: 'Parts',
    partSearch: 'Part Search',
    ids: 'IDs',
    idSearch: 'ID Search',
    settings: 'Settings',
    about: 'About',
    query: 'Decode',
    search: 'Search',
    copy: 'Copy',
    clear: 'Clear',
    input: 'Input',
    result: 'Result',
    noData: 'No data',
    server: 'Server',
    controllerGroup: 'Controller Group',
    lang: 'Language',
    theme: 'Theme',
    dark: 'Dark',
    light: 'Light',
    system: 'System',
    saved: 'Saved',
    failed: 'Request failed',
    loading: 'Loading...',
    serverInfo: 'Server Info',
    resetStats: 'Reset Stats',
    stats: 'Stats',
    httpOnly: 'HTTP-only pico build',
    aboutText: 'A tiny single-file build that keeps HTTP decode/search workflows and removes the embedded parser and full workstation UI.'
  }
};

const $ = selector => document.querySelector(selector);
const el = (tag, props = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value !== false && value !== undefined && value !== null) node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of Array.isArray(children) ? children : [children]) {
    if (child !== undefined && child !== null) node.append(child);
  }
  return node;
};

const state = {
  lang: localStorage.lang === 'eng' ? 'eng' : 'chs',
  theme: ['0', '1', '2'].includes(localStorage.theme) ? localStorage.theme : '0',
  server: LOCKED_SERVER ? DEFAULT_SERVER : localStorage.server || DEFAULT_SERVER,
  controllerGroup: localStorage.controllerGroups || 'all',
  route: parseRoute(),
  busy: false,
  result: null,
  error: ''
};

function msg(key) {
  return t[state.lang][key] || key;
}

function normalizeQuery(value) {
  return String(value || '').trim().toUpperCase();
}

function compactQuery(value) {
  return normalizeQuery(value).replace(/,/g, '').replace(/\s+/g, '');
}

function apiUrl(endpoint, params = {}) {
  const url = new URL(`${state.server.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  }
  return url.toString();
}

async function request(endpoint, params) {
  const response = await fetch(apiUrl(endpoint, {
    lang: state.lang,
    controllerGroup: state.controllerGroup || 'all',
    ...params
  }));
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

function parseRoute() {
  const text = decodeURIComponent(location.hash.replace(/^#/, '') || '/parts');
  const parts = text.split('/').filter(Boolean);
  const locale = ['en', 'zh'].includes(parts[0]) ? parts.shift() : '';
  if (locale) localStorage.lang = locale === 'en' ? 'eng' : 'chs';
  if (parts[0] === 'ids') {
    if (parts[1] === 'search') return { view: 'idSearch', query: parts.slice(2).join('/') };
    return { view: 'ids', query: parts.slice(1).join('/') };
  }
  if (parts[0] === 'settings') return { view: 'settings', query: '' };
  if (parts[0] === 'about') return { view: 'about', query: '' };
  if (parts[0] === 'parts' && parts[1] === 'search') return { view: 'partSearch', query: parts.slice(2).join('/') };
  return { view: 'parts', query: parts[0] === 'parts' ? parts.slice(1).join('/') : '' };
}

function setHash(view, query = '') {
  const safe = encodeURIComponent(query);
  const path = view === 'ids' ? `/ids/${safe}` :
    view === 'idSearch' ? `/ids/search/${safe}` :
      view === 'partSearch' ? `/parts/search/${safe}` :
        view === 'settings' ? '/settings' :
          view === 'about' ? '/about' :
            `/parts/${safe}`;
  location.hash = path.replace(/\/$/, '');
}

function applyTheme() {
  const systemLight = window.matchMedia?.('(prefers-color-scheme: light)').matches;
  document.documentElement.classList.toggle('light', state.theme === '1' || (state.theme === '2' && systemLight));
}

function saveSettings() {
  if (!LOCKED_SERVER) localStorage.server = state.server;
  localStorage.lang = state.lang;
  localStorage.theme = state.theme;
  localStorage.controllerGroups = state.controllerGroup || 'all';
  applyTheme();
}

function statKey(view) {
  return {
    parts: 'statDecodeId',
    partSearch: 'statSearchPn',
    ids: 'statDecodeFid',
    idSearch: 'statSearchId'
  }[view];
}

function incStat(view) {
  const key = statKey(view);
  if (!key) return;
  localStorage[key] = String((Number(localStorage[key]) || 0) + 1);
}

function notify(text, error = false) {
  const toast = $('.toast');
  toast.textContent = text;
  toast.classList.toggle('error', error);
  toast.classList.remove('hidden');
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.add('hidden'), 1800);
}

function display(value) {
  if (value === undefined || value === null || value === '') return '-';
  if (Array.isArray(value)) return value.map(display).filter(item => item !== '-').join(', ') || '-';
  if (typeof value === 'object') {
    return Object.entries(value).map(([key, item]) => `${key}: ${display(item)}`).join(', ');
  }
  return String(value);
}

function fieldValue(field) {
  if (!field) return '-';
  if (field.display) return display(field.display);
  if (field.unit && typeof field.value !== 'object') return `${display(field.value)} ${field.unit}`;
  return display(field.value);
}

function deviceTitle(item) {
  const device = item?.device || item;
  return device?.partNumber || device?.identifier || device?.markingCode || item?.title || item?.input?.query || '-';
}

function deviceVendor(item) {
  const device = item?.device || item;
  return device?.vendor?.name || device?.vendor?.id || '';
}

function renderFields(fields = []) {
  const rows = fields
    .filter(Boolean)
    .map(field => el('div', { class: 'kv' }, [
      el('div', { class: 'muted', text: field.label || field.key || '-' }),
      el('div', { text: fieldValue(field) })
    ]));
  return rows.length ? rows : [el('div', { class: 'muted', text: msg('noData') })];
}

function renderResult(data) {
  if (!data) return el('div', { class: 'muted', text: msg('noData') });
  if (Array.isArray(data.items)) {
    return el('div', { class: 'cards' }, data.items.map(item => el('div', { class: 'list-card' }, [
      el('strong', { text: deviceTitle(item) }),
      el('div', { class: 'meta', text: [deviceVendor(item), item.subtitle].filter(Boolean).join(' · ') }),
      el('div', {}, renderFields(item.fields || item.device?.fields || [])),
      el('button', {
        text: msg('query'),
        onclick: () => setHash(data.operation?.includes('identifier') ? 'ids' : 'parts', deviceTitle(item))
      })
    ])));
  }
  const blocks = Array.isArray(data.blocks) ? data.blocks : [];
  if (!blocks.length) {
    const fields = Object.entries(data)
      .filter(([key]) => !['items', 'blocks'].includes(key))
      .map(([key, value]) => ({ key, label: key, value }));
    return el('div', { class: 'blocks' }, [
      el('section', { class: 'panel' }, [
        el('div', { class: 'panel-head', text: data.schemaVersion || msg('result') }),
        el('div', { class: 'panel-body' }, renderFields(fields))
      ])
    ]);
  }
  const title = deviceTitle(data);
  return el('div', { class: 'blocks' }, [
    el('div', { class: 'list-card' }, [
      el('strong', { text: title }),
      el('div', { class: 'meta', text: [deviceVendor(data), data.status].filter(Boolean).join(' · ') }),
      el('button', { text: msg('copy'), onclick: () => copyText(summaryText(data)) })
    ]),
    ...blocks.map(block => el('section', { class: 'panel' }, [
      el('div', { class: 'panel-head', text: block.label || block.id || 'Block' }),
      el('div', { class: 'panel-body' }, renderFields(block.fields || []))
    ])),
    renderLinks(data.links)
  ]);
}

function renderLinks(links = []) {
  const safeLinks = links.filter(link => link?.url && link?.label);
  if (!safeLinks.length) return el('span');
  return el('section', { class: 'panel' }, [
    el('div', { class: 'panel-head', text: 'Links' }),
    el('div', { class: 'panel-body' }, safeLinks.map(link => el('a', {
      href: link.url,
      target: '_blank',
      rel: 'noopener noreferrer',
      text: link.label
    })))
  ]);
}

function summaryText(data) {
  if (!data) return '';
  const lines = [deviceTitle(data), deviceVendor(data), data.status].filter(Boolean);
  for (const block of data.blocks || []) {
    for (const field of block.fields || []) lines.push(`${field.label || field.key}: ${fieldValue(field)}`);
  }
  return lines.join('\n');
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    notify(msg('copy'));
  } catch {
    notify(text);
  }
}

async function run(view, query) {
  const q = compactQuery(query);
  if (!q) return;
  state.busy = true;
  state.error = '';
  render();
  try {
    const common = { query: q };
    const data = view === 'partSearch'
      ? await request('parts/search', { ...common, limit: 50 })
      : view === 'ids'
        ? await request('identifiers/decode', { ...common, idScheme: 'nand.flash_id' })
        : view === 'idSearch'
          ? await request('identifiers/search', { ...common, idScheme: 'nand.flash_id', limit: 50 })
          : await request('parts/decode', common);
    state.result = data;
    incStat(view);
  } catch (error) {
    state.error = `${msg('failed')}: ${error.message}`;
  } finally {
    state.busy = false;
    render();
  }
}

function routeLabel(view) {
  return {
    parts: msg('parts'),
    partSearch: msg('partSearch'),
    ids: msg('ids'),
    idSearch: msg('idSearch'),
    settings: msg('settings'),
    about: msg('about')
  }[view] || msg('parts');
}

function queryView(view) {
  const input = el('input', {
    value: state.route.query,
    placeholder: msg('input'),
    onkeydown: event => {
      if (event.key === 'Enter') setHash(view, event.currentTarget.value);
    }
  });
  return el('div', { class: 'grid' }, [
    el('section', { class: 'panel' }, [
      el('div', { class: 'panel-head', text: routeLabel(view) }),
      el('div', { class: 'panel-body' }, [
        el('div', { class: 'row' }, [el('label', { text: msg('input') }), input]),
        el('div', { class: 'actions' }, [
          el('button', { class: 'primary', text: view.includes('Search') ? msg('search') : msg('query'), onclick: () => setHash(view, input.value) }),
          el('button', { text: msg('clear'), onclick: () => { state.result = null; input.value = ''; render(); } })
        ])
      ])
    ]),
    el('section', { class: 'panel' }, [
      el('div', { class: 'panel-head' }, [
        el('span', { text: msg('result') }),
        state.busy ? el('span', { class: 'status', text: msg('loading') }) : el('span')
      ]),
      el('div', { class: 'panel-body' }, [
        state.error ? el('div', { class: 'error', text: state.error }) : renderResult(state.result)
      ])
    ])
  ]);
}

function settingsView() {
  const server = el('input', { value: state.server, disabled: LOCKED_SERVER });
  const controllerGroup = el('input', { value: state.controllerGroup || 'all' });
  const lang = el('select', {}, [
    el('option', { value: 'chs', text: '中文', selected: state.lang === 'chs' }),
    el('option', { value: 'eng', text: 'English', selected: state.lang === 'eng' })
  ]);
  const theme = el('select', {}, [
    el('option', { value: '0', text: msg('dark'), selected: state.theme === '0' }),
    el('option', { value: '1', text: msg('light'), selected: state.theme === '1' }),
    el('option', { value: '2', text: msg('system'), selected: state.theme === '2' })
  ]);
  return el('section', { class: 'panel' }, [
    el('div', { class: 'panel-head', text: msg('settings') }),
    el('div', { class: 'panel-body' }, [
      el('div', { class: 'row' }, [el('label', { text: msg('server') }), server]),
      el('div', { class: 'row' }, [el('label', { text: msg('controllerGroup') }), controllerGroup]),
      el('div', { class: 'row' }, [el('label', { text: msg('lang') }), lang]),
      el('div', { class: 'row' }, [el('label', { text: msg('theme') }), theme]),
      el('div', { class: 'actions' }, [
        el('button', { class: 'primary', text: msg('saved'), onclick: () => {
          state.server = server.value.trim() || DEFAULT_SERVER;
          state.controllerGroup = controllerGroup.value.trim() || 'all';
          state.lang = lang.value;
          state.theme = theme.value;
          saveSettings();
          render();
          notify(msg('saved'));
        } }),
        el('button', { text: msg('serverInfo'), onclick: () => runInfo() }),
        el('button', { text: msg('resetStats'), onclick: () => {
          for (const key of ['statDecodeId', 'statSearchPn', 'statDecodeFid', 'statSearchId']) localStorage[key] = '0';
          render();
        } })
      ]),
      el('div', { class: 'meta', text: `${msg('stats')}: PN ${localStorage.statDecodeId || 0} / PNS ${localStorage.statSearchPn || 0} / ID ${localStorage.statDecodeFid || 0} / IDS ${localStorage.statSearchId || 0}` }),
      state.error ? el('div', { class: 'error', text: state.error }) : renderResult(state.result)
    ])
  ]);
}

async function runInfo() {
  state.error = '';
  state.busy = true;
  render();
  try {
    state.result = await request('capabilities', {});
  } catch (error) {
    state.error = `${msg('failed')}: ${error.message}`;
  } finally {
    state.busy = false;
    render();
  }
}

function aboutView() {
  return el('section', { class: 'panel' }, [
    el('div', { class: 'panel-head', text: 'FlashMaster' }),
    el('div', { class: 'panel-body' }, [
      el('div', { text: msg('aboutText') }),
      el('div', { class: 'meta', text: `FlashMaster ${VERSION_TEXT}` }),
      el('div', { class: 'meta', text: `fdnext ${FDNEXT_TEXT}` }),
      el('div', { class: 'meta', text: 'AGPL-3.0' })
    ])
  ]);
}

function render() {
  document.title = `FlashMaster / ${routeLabel(state.route.view)}`;
  const nav = ['parts', 'partSearch', 'ids', 'idSearch', 'settings', 'about'].map(view => el('button', {
    class: state.route.view === view ? 'active' : '',
    text: routeLabel(view),
    onclick: () => setHash(view)
  }));
  const content = ['parts', 'partSearch', 'ids', 'idSearch'].includes(state.route.view)
    ? queryView(state.route.view)
    : state.route.view === 'settings'
      ? settingsView()
      : aboutView();
  $('#app').replaceChildren(el('div', { class: 'shell' }, [
    el('aside', { class: 'side' }, [
      el('div', { class: 'brand' }, [
        el('div', { class: 'brand-title', text: 'FlashMaster' }),
        el('div', { class: 'muted', text: msg('tagline') }),
        el('div', { class: 'muted', text: VERSION_TEXT }),
        el('div', { class: 'muted', text: msg('httpOnly') })
      ]),
      el('nav', { class: 'nav' }, nav),
      el('div', { class: 'footer', text: '© 2019-2026 iTX Technologies' })
    ]),
    el('main', { class: 'main' }, [
      el('div', { class: 'top' }, [
        el('div', { class: 'title', text: `FlashMaster / ${routeLabel(state.route.view)}` }),
        el('div', { class: 'hint', text: state.server })
      ]),
      content
    ])
  ]));
}

window.addEventListener('hashchange', () => {
  state.route = parseRoute();
  state.result = null;
  state.error = '';
  render();
  if (state.route.query && ['parts', 'partSearch', 'ids', 'idSearch'].includes(state.route.view)) {
    run(state.route.view, state.route.query);
  }
});

saveSettings();
render();
if (state.route.query && ['parts', 'partSearch', 'ids', 'idSearch'].includes(state.route.view)) {
  run(state.route.view, state.route.query);
}
