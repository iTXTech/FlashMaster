const getServerAddress = () => {
    return localStorage.server || "https://fd.sakuracg.com"
};

const setServerAddress = (addr) => {
    localStorage.server = addr
};

const autoTranslation = () => {
    return (localStorage.autoTranslation || "1");
};

const setAutoTranslation = (auto) => {
    localStorage.autoTranslation = auto ? "1" : "0";
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

export default {
    getServerAddress,
    setServerAddress,
    autoTranslation,
    setAutoTranslation,
    statDecodeIdInc,
    statDecodeId,
    statSearchPnInc,
    statSearchPn,
    statSearchIdInc,
    statSearchId,
    resetStat
}
