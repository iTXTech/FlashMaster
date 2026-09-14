// Single-file builds never create an installer, reactive state, or browser listeners.
const noop = () => {};
const disabledInstall = {
  state: { enabled: false, standalone: false },
  available: false,
  entryVisible: false,
  nativeOnly: false,
  actionAvailable: false,
  title: '',
  install: noop,
  setHintsEnabled: noop
};

export const pwaInstall = { start: noop, stop: noop };
export const usePwaInstall = () => disabledInstall;
