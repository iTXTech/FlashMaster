import { computed, ref, watch } from 'vue';

// Keep the raw response stable: only the current page is projected/reactive.
export function usePagedItems(items, initialPerPage = 15, projectItem = () => item => item) {
  const page = ref(1);
  const perPage = ref(initialPerPage);
  const pageCount = computed(() => Math.max(1, Math.ceil(items().length / perPage.value)));
  const pagedItems = computed(() => {
    const start = (page.value - 1) * perPage.value;
    const project = projectItem();
    return items().slice(start, start + perPage.value).map((item, index) => project(item, start + index));
  });
  watch(items, () => { page.value = 1; }, { flush: 'sync' });
  watch(perPage, () => { page.value = 1; }, { flush: 'sync' });
  watch(pageCount, count => { page.value = Math.min(page.value, count); }, { flush: 'sync' });
  return { page, perPage, pageCount, pagedItems };
}
