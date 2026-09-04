import { watch } from 'vue';

// The route owns the submitted query; editable input must never deduplicate navigation.
export function useRouteLookup({ query, locale, navigate, reset, run }) {
  function refresh(value, recordUsage = true) {
    reset(value);
    if (value) return run(value, { recordUsage });
  }

  watch([query, locale], ([value], [previousQuery]) => {
    // Changing language on an empty route should preserve an unsubmitted draft.
    if (!value && value === previousQuery) return;
    return refresh(value, value !== previousQuery);
  }, { immediate: true });

  return {
    submit(value) {
      if (value !== query()) return navigate(value);
      // A repeated submission is an explicit retry, even after an empty result/error.
      return refresh(value);
    }
  };
}
