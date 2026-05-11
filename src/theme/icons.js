import { h } from 'vue';
import {
  mdiAccountGroupOutline,
  mdiArrowRight,
  mdiBookInformationVariant,
  mdiBookOpenPageVariantOutline,
  mdiCartOutline,
  mdiCheck,
  mdiChevronDown,
  mdiChevronLeft,
  mdiChevronRight,
  mdiChevronUp,
  mdiChip,
  mdiClose,
  mdiContentCopy,
  mdiCrosshairsGps,
  mdiDomain,
  mdiFileDocumentOutline,
  mdiFlash,
  mdiHistory,
  mdiInformationOutline,
  mdiMagnify,
  mdiMemory,
  mdiOpenInNew,
  mdiRefresh,
  mdiTools,
  mdiTranslate,
  mdiTune
} from '@mdi/js';
import { aliases, mdi as mdiSvg } from 'vuetify/iconsets/mdi-svg';

const mdiIconPaths = Object.freeze({
  'mdi-account-group-outline': mdiAccountGroupOutline,
  'mdi-arrow-right': mdiArrowRight,
  'mdi-book-information-variant': mdiBookInformationVariant,
  'mdi-book-open-page-variant-outline': mdiBookOpenPageVariantOutline,
  'mdi-cart-outline': mdiCartOutline,
  'mdi-check': mdiCheck,
  'mdi-chevron-down': mdiChevronDown,
  'mdi-chevron-left': mdiChevronLeft,
  'mdi-chevron-right': mdiChevronRight,
  'mdi-chevron-up': mdiChevronUp,
  'mdi-chip': mdiChip,
  'mdi-close': mdiClose,
  'mdi-content-copy': mdiContentCopy,
  'mdi-crosshairs-gps': mdiCrosshairsGps,
  'mdi-domain': mdiDomain,
  'mdi-file-document-outline': mdiFileDocumentOutline,
  'mdi-flash': mdiFlash,
  'mdi-history': mdiHistory,
  'mdi-information-outline': mdiInformationOutline,
  'mdi-magnify': mdiMagnify,
  'mdi-memory': mdiMemory,
  'mdi-open-in-new': mdiOpenInNew,
  'mdi-refresh': mdiRefresh,
  'mdi-tools': mdiTools,
  'mdi-translate': mdiTranslate,
  'mdi-tune': mdiTune
});

const mdi = {
  component: props => h(mdiSvg.component, {
    ...props,
    icon: mdiIconPaths[props.icon] || props.icon
  })
};

export { aliases, mdi };
