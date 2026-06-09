import { computed, nextTick, ref, unref } from 'vue';

const defaultFormat = value => value;
const defaultNormalize = value => String(value || '');

function eventValue(event, fallback) {
  const value = event?.target?.value;
  return value === undefined || value === null ? fallback : value;
}

function activeTextInput() {
  if (typeof document === 'undefined') return null;
  const element = document.activeElement;
  return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
    ? element
    : null;
}

export function useFormattedQueryInput(source, {
  format = defaultFormat,
  normalize = defaultNormalize
} = {}) {
  const isComposing = ref(false);
  const formatValue = value => format(normalize(value));

  function captureSelection(rawValue) {
    const element = activeTextInput();
    if (!element || element.value !== rawValue || element.selectionStart === null || element.selectionEnd === null) {
      return null;
    }
    const start = format(rawValue.slice(0, element.selectionStart)).length;
    const end = format(rawValue.slice(0, element.selectionEnd)).length;
    return () => {
      const restore = () => {
        if (document.activeElement !== element) return;
        element.setSelectionRange(start, end);
      };
      nextTick(() => {
        restore();
        if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(restore);
        }
      });
    };
  }

  const model = computed({
    get: () => source.value,
    set: value => {
      const raw = normalize(value);
      const next = isComposing.value ? raw : format(raw);
      const restoreSelection = !isComposing.value && next !== raw ? captureSelection(raw) : null;
      source.value = next;
      restoreSelection?.();
    }
  });

  function onCompositionStart() {
    isComposing.value = true;
  }

  function onCompositionEnd(event) {
    isComposing.value = false;
    const raw = normalize(eventValue(event, source.value));
    const next = format(raw);
    const restoreSelection = next !== raw ? captureSelection(raw) : null;
    source.value = next;
    restoreSelection?.();
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
