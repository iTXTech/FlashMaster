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
