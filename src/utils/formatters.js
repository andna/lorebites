export function formatRelativeTime(timestamp) {
    const now = new Date();
    const then = new Date(timestamp * 1000);
    const diffSeconds = Math.floor((now - then) / 1000);
    
    const intervals = {
        yr: 31536000,
        mo: 2592000,
        wk: 604800,
        d: 86400,
        hr: 3600,
        m: 60
    };

    for (let [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(diffSeconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval} ${unit}. ago`;
        }
    }
    
    return 'just now';
}

export function getReadingTime(text) {
    if (!text) return 0;
    const words = text.trim().split(/\s+/).length;
    // Adjusted to ~3.8 words per second * 60 = 234 words per minute
    const secondsToRead = Math.ceil(words / 3.8);
    
    // Format the time nicely
    if (secondsToRead < 60) {
        return `${secondsToRead} sec`;
    } else {
        const minutes = Math.floor(secondsToRead / 60);
        const seconds = secondsToRead % 60;
        return seconds > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}m` : `${minutes}m`;
    }
}

export function getReadingTimeInSeconds(text) {
    if (!text) return 0;
    const words = text.trim().split(/\s+/).length;
    return Math.ceil(words / 3.9);
}