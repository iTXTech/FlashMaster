import colors from 'vuetify/lib/util/colors'

const THEME_DARK = "0"
const THEME_LIGHT = "1"
const THEME_SYSTEM = "2"
const THEME_PINK = "3"

const DEFAULT_COLOR = {
    primary: '#1e88e5',
    secondary: '#005cb2',
    accent: '#1e88e5',
    error: '#b71c1c'
}

const THEMES = {}
THEMES[THEME_DARK] = {
    dark: true,
    card: "#1E1E1E"
}
THEMES[THEME_LIGHT] = {
    dark: false,
    card: "#FFFFFF"
}
THEMES[THEME_SYSTEM] = {}
THEMES[THEME_PINK] = {
    dark: true,
    color: {
        primary: colors.pink.lighten2,
        secondary: colors.pink.lighten1,
        accent: colors.pink.base,
        error: '#b71c1c'
    },
    card: "rgba(50,50,50,0.6); background: rgba(0,0,0,0)",
    appBar: "rgba(236,64,122,0.7)",
    style: {
        position: "fixed",
        zIndex: -1,
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        background: "#000000",
        backgroundImage: `url(${require('@/assets/bg.jpg')}`,
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat"
    }
}

export default {
    THEME_DARK,
    THEME_LIGHT,
    THEME_SYSTEM,
    THEME_PINK,
    DEFAULT_COLOR,
    THEMES
}
