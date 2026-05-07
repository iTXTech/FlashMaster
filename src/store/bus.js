const listeners = new Map();

const on = (event, handler) => {
    if (!listeners.has(event)) {
        listeners.set(event, new Set());
    }
    listeners.get(event).add(handler);
    return () => off(event, handler);
};

const off = (event, handler) => {
    listeners.get(event)?.delete(handler);
};

const emit = (event, payload) => {
    listeners.get(event)?.forEach(handler => handler(payload));
};

export default {
    on,
    off,
    emit
};
