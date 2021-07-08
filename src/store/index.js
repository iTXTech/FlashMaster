const getServerAddress = () => {
    return localStorage.server || "https://fd.sakuracg.com"
};

const setServerAddress = (addr) => {
    localStorage.server = addr
};
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
    if (typeof VERSION !== undefined) {
        // eslint-disable-next-line no-undef
        return VERSION
    } else {
        return "DEBUG"
    }
};

const getLang = () => {
    return localStorage.lang || "chs"
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

const partNumberFormat = str => {
    return str.toUpperCase()
        .replace(/,/g, "")
        .replace(/ /g, "");
}

const setTheme = theme => {
    localStorage.theme = theme;
}

const getTheme = () => {
    if (isNaN(Number(localStorage.theme))) {
        setTheme("0");
    }
    return localStorage.theme
}

const formatNumber = (bytes, unit = 1, inBit = false, outBit = false) => {
    if (typeof bytes !== "number") return bytes;
    if (bytes === 0) return '0 b';
    const k = 1024;
    //const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['b', 'Kb', 'Mb', 'Gb', 'Tb', 'Pb', 'Eb', 'Zb', 'Yb'];
    if (inBit && !outBit) bytes /= 8;
    if (!inBit && outBit) bytes *= 8;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const r = parseFloat((bytes / Math.pow(k, i)).toFixed(0)) + ' ' + sizes[i + unit];
    return outBit ? r : r.toUpperCase();
}

export default {
    getServerAddress,
    setServerAddress,
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
    getLang,
    setAutoHideSoftKeyboard,
    isAutoHideSoftKeyboard,
    partNumberFormat,
    setTheme,
    getTheme,
    formatNumber
}
