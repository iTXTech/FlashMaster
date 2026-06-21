<template>
  <v-combobox
    ref="combo"
    :model-value="modelValue"
    :menu="menuOpen"
    :items="items"
    item-title="value"
    item-value="value"
    :return-object="false"
    :loading="loading"
    class="pn"
    clearable
    hide-details
    :menu-props="{ contentClass: 'query-suggestion-menu' }"
    no-filter
    :auto-select-first="false"
    :label="label"
    @update:menu="menuOpen = $event"
    @update:search="handleSearchUpdate"
    @update:model-value="commitModelValue"
    @keydown.enter="submitCurrentInput"
    @compositionstart="onCompositionStart"
    @compositionend="onCompositionEnd"
    @blur="event => emit('blur', event)"
  >
    <template #item="{ props, item }">
      <v-list-item
        v-bind="props"
        class="query-suggestion-option"
        :title="item.title || item.value"
        :subtitle="item.subtitle"
      />
    </template>
  </v-combobox>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  items: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  label: {
    type: String,
    required: true
  }
});

const emit = defineEmits([
  'update:modelValue',
  'search',
  'select',
  'submit',
  'compositionstart',
  'compositionend',
  'blur'
]);

const combo = ref(null);
const menuOpen = ref(false);
const isComposing = ref(false);
let submitToken = 0;
let selectedInCurrentTurn = false;

watch(() => props.items.length, length => {
  menuOpen.value = length > 0;
});

function textValue(value) {
  if (value && typeof value === 'object') {
    return String(value.value || value.title || '');
  }
  return String(value || '');
}

function suggestionFor(value) {
  const text = textValue(value).trim();
  if (!text) return null;
  return props.items.find(item => [item?.value, item?.title]
    .some(key => textValue(key).trim() === text)) || null;
}

function cancelPendingSubmit() {
  submitToken += 1;
}

function markSuggestionSelected() {
  selectedInCurrentTurn = true;
  setTimeout(() => {
    selectedInCurrentTurn = false;
  }, 0);
}

function commitModelValue(value) {
  emit('update:modelValue', value);
  const suggestion = suggestionFor(value);
  if (!suggestion) return;
  cancelPendingSubmit();
  markSuggestionSelected();
  menuOpen.value = false;
  emit('select', suggestion);
}

function submitCurrentInput(event) {
  if (event?.isComposing || isComposing.value) {
    return;
  }
  menuOpen.value = false;
  if (selectedInCurrentTurn) {
    selectedInCurrentTurn = false;
    return;
  }
  const token = ++submitToken;
  setTimeout(() => {
    if (token !== submitToken) return;
    emit('submit');
  }, 0);
}

function handleSearchUpdate(value) {
  if (isComposing.value) return;
  emit('search', value);
}

function onCompositionStart(event) {
  isComposing.value = true;
  emit('compositionstart', event);
}

function onCompositionEnd(event) {
  isComposing.value = false;
  emit('compositionend', event);
  emit('search', event?.target?.value || props.modelValue);
}

function focus() {
  combo.value?.focus?.();
}

function blur() {
  combo.value?.blur?.();
}

defineExpose({
  focus,
  blur
});
</script>
