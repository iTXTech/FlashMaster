const THEME_DARK = "0"
const THEME_LIGHT = "1"
const THEME_SYSTEM = "2"

const DEFAULT_COLOR = {
    primary: '#00a884',
    secondary: '#f2b84b',
    accent: '#4c8dff',
    error: '#d64545'
}

const VUETIFY_THEMES = {
    flashDark: {
        dark: true,
        colors: {
            background: '#111316',
            surface: '#181c20',
            'surface-variant': '#20262c',
            'on-background': '#edf2f5',
            'on-surface': '#edf2f5',
            'on-surface-variant': '#edf2f5',
            primary: DEFAULT_COLOR.primary,
            'on-primary': '#001f18',
            secondary: DEFAULT_COLOR.secondary,
            'on-secondary': '#241600',
            accent: DEFAULT_COLOR.accent,
            'on-accent': '#ffffff',
            error: DEFAULT_COLOR.error,
            'on-error': '#ffffff'
        }
    },
    flashLight: {
        dark: false,
        colors: {
            background: '#f5f7f8',
            surface: '#ffffff',
            'surface-variant': '#edf1f3',
            'on-background': '#161b1f',
            'on-surface': '#161b1f',
            'on-surface-variant': '#161b1f',
            primary: '#00795f',
            'on-primary': '#ffffff',
            secondary: '#9a6700',
            'on-secondary': '#ffffff',
            accent: '#2f6fed',
            'on-accent': '#ffffff',
            error: DEFAULT_COLOR.error,
            'on-error': '#ffffff'
        }
    }
};

const THEME_NAMES = {
    [THEME_DARK]: 'flashDark',
    [THEME_LIGHT]: 'flashLight',
    [THEME_SYSTEM]: 'flashDark'
};

const resolveThemeName = theme => {
    if (theme === THEME_SYSTEM) {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'flashLight' : 'flashDark';
    }
    return THEME_NAMES[theme] || THEME_NAMES[THEME_DARK];
};

export default {
    THEME_DARK,
    THEME_LIGHT,
    THEME_SYSTEM,
    DEFAULT_COLOR,
    VUETIFY_THEMES,
    THEME_NAMES,
    resolveThemeName
}
