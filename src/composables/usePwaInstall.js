import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { createPwaInstall } from '@/services/pwaInstall';
import store from '@/store';

export const pwaInstall = createPwaInstall({
  window,
  enabled: !__FLASHMASTER_SINGLEFILE__,
  preferences: store
});

export function usePwaInstall() {
  const { t } = useI18n();
  const title = computed(() => t(pwaInstall.state.mobile ? 'install.homeScreen' : 'install.desktop'));
  const action = computed(() => pwaInstall.nativeOnly.value || pwaInstall.state.canPrompt ? title.value : t('install.viewSteps'));
  return { ...pwaInstall, title, action };
}
