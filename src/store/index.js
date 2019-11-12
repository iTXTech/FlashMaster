const getServerAddress = () => {
    return localStorage.server || "https://fd.sakuracg.com"
}

const setServerAddress = (addr) => {
    localStorage.server = addr
}

const autoTranslation = () => {
    return (localStorage.autoTranslation || "1");
}

const setAutoTranslation = (auto) => {
    localStorage.autoTranslation = auto ? "1" : "0";
}

export default {
    getServerAddress,
    setServerAddress,
    autoTranslation,
    setAutoTranslation
}