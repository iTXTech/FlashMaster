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
    card: "rgb(10,10,10,0.5)",
    style: 'background: #233333; object-fit: cover; background-position: center center; background-repeat: no-repeat; background-image: url("https://konachan.net/jpeg/615010d6dd655340bb79eaeafef963d4/Konachan.com%20-%20311258%20black_hair%20blue_eyes%20blush%20breasts%20couch%20long_hair%20original%20pantyhose%20p%21nta%20school_uniform%20skirt%20tie.jpg");'
}

export default {
    THEME_DARK,
    THEME_LIGHT,
    THEME_SYSTEM,
    THEME_PINK,
    DEFAULT_COLOR,
    THEMES
}
