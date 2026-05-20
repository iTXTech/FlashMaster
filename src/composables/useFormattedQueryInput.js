import { computed, ref, unref } from 'vue';

const defaultFormat = value => value;
const defaultNormalize = value => String(value || '');

function eventValue(event, fallback) {
  const value = event?.target?.value;
  return value === undefined || value === null ? fallback : value;
}

export function useFormattedQueryInput(source, {
  format = defaultFormat,
  normalize = defaultNormalize
} = {}) {
  const isComposing = ref(false);
  const formatValue = value => format(normalize(value));

  const model = computed({
    get: () => source.value,
    set: value => {
      const raw = normalize(value);
      source.value = isComposing.value ? raw : format(raw);
    }
  });

  function onCompositionStart() {
    isComposing.value = true;
  }

  function onCompositionEnd(event) {
    isComposing.value = false;
    source.value = formatValue(eventValue(event, source.value));
  }

  function onBlur() {
    source.value = formatValue(source.value);
  }

  function shouldSkipEnter(event, ...guards) {
    return Boolean(
      event?.isComposing
        || isComposing.value
        || guards.some(guard => unref(guard))
    );
  }

  return {
    model,
    onCompositionStart,
    onCompositionEnd,
    onBlur,
    shouldSkipEnter
  };
}

export function useComboboxSuggestionCommit(items, {
  itemKeys = item => [item?.value, item?.title],
  normalize = defaultNormalize,
  commit,
  submit
} = {}) {
  let recentItemLookup = new Map();
  let queuedSubmitToken = 0;

  function normalizedKey(value) {
    return normalize(value).trim();
  }

  function updateItems(nextItems) {
    items.value = nextItems;
    recentItemLookup = new Map();
    for (const item of nextItems) {
      for (const key of itemKeys(item)) {
        const text = normalizedKey(key);
        if (text) recentItemLookup.set(text, item);
      }
    }
  }

  function findItem(value) {
    const text = normalizedKey(value);
    return items.value.find(item => itemKeys(item).some(key => normalizedKey(key) === text))
      || recentItemLookup.get(text);
  }

  function cancelQueuedSubmit() {
    queuedSubmitToken += 1;
  }

  function queueSubmit() {
    const token = ++queuedSubmitToken;
    setTimeout(() => {
      if (token !== queuedSubmitToken) return;
      submit?.();
    }, 0);
  }

  async function select(value) {
    const item = findItem(value);
    if (!item) return false;
    cancelQueuedSubmit();
    commit?.(item);
    await submit?.();
    return true;
  }

  return {
    updateItems,
    select,
    queueSubmit,
    cancelQueuedSubmit
  };
}
