export function setCookie(name, value, days = 365) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/`;
}

export function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
}

export function getUserVotes() {
    try {
        return JSON.parse(getCookie("userVotes") || "{}");
    } catch {
        return {};
    }
}

export function setUserVotes(votesObj) {
    setCookie("userVotes", JSON.stringify(votesObj));
}

export function getLastSubmissionTime() {
    return parseInt(getCookie("lastSubmissionTime") || "0", 10);
}

export function setLastSubmissionTime(timestamp) {
    setCookie("lastSubmissionTime", timestamp);
}

export function debounce(func, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

export function darkenColor(hex, amount = 0.2) {
    hex = hex.replace("#", "");
    const r = Math.floor(parseInt(hex.substring(0, 2), 16) * (1 - amount));
    const g = Math.floor(parseInt(hex.substring(2, 4), 16) * (1 - amount));
    const b = Math.floor(parseInt(hex.substring(4, 6), 16) * (1 - amount));
    return `#${[r, g, b].map(x => x.toString(16).padStart(2, "0")).join("")}`;
}
