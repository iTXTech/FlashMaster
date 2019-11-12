const getServerAddress = () => {
    return localStorage.server || "https://fd.sakuracg.com"
}

const setServerAddress = (addr) => {
    localStorage.server = addr
}

const autoTranslation = () => {
    return localStorage.autoTranslation == "true" ? "1" : "0";
}

const setAutoTranslation = (auto) => {
    localStorage.autoTranslation = auto ? "true" : "false";
}

export default {
    getServerAddress,
    setServerAddress,
    autoTranslation,
    setAutoTranslation
}