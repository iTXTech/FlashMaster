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

const resetStat = () => {
    localStorage.statDecodeId = "0";
    localStorage.statSearchId = "0";
    localStorage.statSearchPn = "0";
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
    return true
}

const setAutoHideSoftKeyboard = (b) => {
    localStorage.autoHideSoftKeyboard = b ? "1" : "0"
}

const isAutoHideSoftKeyboard = () => {
    if (isNaN(Number(localStorage.autoHideSoftKeyboard))) {
        localStorage.autoHideSoftKeyboard = isMobile();
    }
    return localStorage.autoHideSoftKeyboard === "1"
}

const partNumberFormat = str => {
    return str.toUpperCase()
        .replace(/,/g, "")
        .replace(/ /g, "");
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
    resetStat,
    getProjectVersion,
    getLang,
    setAutoHideSoftKeyboard,
    isAutoHideSoftKeyboard,
    partNumberFormat
}
