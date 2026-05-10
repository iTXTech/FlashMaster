const SERVER_PRESET_CLOUD = "cloud";
const SERVER_PRESET_LOCAL_DEV = "localDev";
const SERVER_PRESETS = Object.freeze([
    {
        id: SERVER_PRESET_CLOUD,
        address: "https://fdnext.itxtech.org"
    },
    {
        id: SERVER_PRESET_LOCAL_DEV,
        address: "http://127.0.0.1:8080"
    }
]);
const DEFAULT_SERVER_ADDRESS = import.meta.env.VITE_FLASHMASTER_SERVER || SERVER_PRESETS[0].address;
const PARSER_EMBEDDED = "embedded";
const PARSER_HTTP = "http";

const getDefaultServerAddress = () => DEFAULT_SERVER_ADDRESS;

const getServerPresets = () => SERVER_PRESETS.map(item => ({ ...item }));

const getServerAddress = () => {
    return localStorage.server || DEFAULT_SERVER_ADDRESS
};

const setServerAddress = (addr) => {
    const normalized = String(addr || "").trim();
    if (normalized) {
        localStorage.server = normalized;
    } else {
        localStorage.removeItem("server");
    }
};

const setParserMode = mode => {
    localStorage.parserMode = mode === PARSER_HTTP ? PARSER_HTTP : PARSER_EMBEDDED;
}

const getParserMode = () => {
    if (![PARSER_EMBEDDED, PARSER_HTTP].includes(localStorage.parserMode)) {
        setParserMode(PARSER_EMBEDDED);
    }
    return localStorage.parserMode;
}

const isEmbeddedParser = () => getParserMode() === PARSER_EMBEDDED;

const statDecodeIdInc = () => {
    if (isNaN(Number(localStorage.statDecodeId))) {
        localStorage.statDecodeId = "0";
    }
    localStorage.statDecodeId = String(Number(localStorage.statDecodeId) + 1);
};

const statDecodeId = () => {
    return localStorage.statDecodeId || 0;
};

const statSearchPnInc = () => {
    if (isNaN(Number(localStorage.statSearchPn))) {
        localStorage.statSearchPn = "0";
    }
    localStorage.statSearchPn = String(Number(localStorage.statSearchPn) + 1);
};

const statSearchPn = () => {
    return localStorage.statSearchPn || 0;
};

const statSearchIdInc = () => {
    if (isNaN(Number(localStorage.statSearchId))) {
        localStorage.statSearchId = "0";
    }
    localStorage.statSearchId = String(Number(localStorage.statSearchId) + 1);
};

const statSearchId = () => {
    return localStorage.statSearchId || 0;
};

const statDecodeFidInc = () => {
    if (isNaN(Number(localStorage.statDecodeFid))) {
        localStorage.statDecodeFid = "0";
    }
    localStorage.statDecodeFid = String(Number(localStorage.statDecodeFid) + 1);
};

const statDecodeFid = () => {
    return localStorage.statDecodeFid || 0;
};

const resetStat = () => {
    localStorage.statDecodeId = "0";
    localStorage.statSearchId = "0";
    localStorage.statSearchPn = "0";
    localStorage.statDecodeFid = "0";
};

const getProjectVersion = () => {
    if (typeof VERSION !== "undefined") {
        return VERSION
    } else {
        return "DEBUG"
    }
};

const getChangelogVersion = (version = getProjectVersion()) => {
    return String(version || "").split("-").at(0) || "";
};

const getSeenChangelogVersion = () => {
    return getChangelogVersion(localStorage.seenChangelogVersion || "");
};

const setSeenChangelogVersion = version => {
    localStorage.seenChangelogVersion = getChangelogVersion(version);
};

const shouldShowChangelog = version => {
    const normalized = getChangelogVersion(version);
    return normalized && getSeenChangelogVersion() !== normalized;
};

const getLang = () => {
    return localStorage.lang || "chs"
}

const setLang = lang => {
    localStorage.lang = lang;
}

const isMobile = () => {
    return /Mobi/i.test(window.navigator.userAgent)
}

const setAutoHideSoftKeyboard = (b) => {
    localStorage.autoHideSoftKeyboard = b ? "1" : "0"
}

const isAutoHideSoftKeyboard = () => {
    if (isNaN(Number(localStorage.autoHideSoftKeyboard))) {
        setAutoHideSoftKeyboard(isMobile());
    }
    return localStorage.autoHideSoftKeyboard === "1"
}

const setMarketTickerEnabled = (b) => {
    localStorage.marketTicker = b ? "1" : "0"
}

const isMarketTickerEnabled = () => {
    if (!["0", "1"].includes(localStorage.marketTicker)) {
        setMarketTickerEnabled(true);
    }
    return localStorage.marketTicker === "1"
}

const queryInputFormat = str => String(str || "").toUpperCase();

const partNumberFormat = str => {
    return queryInputFormat(str)
        .replace(/,/g, "")
        .replace(/\s+/g, "");
}

const setTheme = theme => {
    localStorage.theme = theme;
}

const getTheme = () => {
    if (!["0", "1", "2"].includes(localStorage.theme)) {
        setTheme("0");
    }
    return localStorage.theme
}

export default {
    PARSER_EMBEDDED,
    PARSER_HTTP,
    SERVER_PRESET_CLOUD,
    SERVER_PRESET_LOCAL_DEV,
    getDefaultServerAddress,
    getServerPresets,
    getServerAddress,
    setServerAddress,
    setParserMode,
    getParserMode,
    isEmbeddedParser,
    statDecodeIdInc,
    statDecodeId,
    statSearchPnInc,
    statSearchPn,
    statSearchIdInc,
    statSearchId,
    statDecodeFidInc,
    statDecodeFid,
    resetStat,
    getProjectVersion,
    getChangelogVersion,
    getSeenChangelogVersion,
    setSeenChangelogVersion,
    shouldShowChangelog,
    getLang,
    setLang,
    setAutoHideSoftKeyboard,
    isAutoHideSoftKeyboard,
    setMarketTickerEnabled,
    isMarketTickerEnabled,
    queryInputFormat,
    partNumberFormat,
    setTheme,
    getTheme
}
