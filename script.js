import { renderSubredditButtons } from './views/main.js';
import { loadSubreddit, handleSortChange } from './views/postsList.js';
import { showPost } from './views/singlePost.js';
import { showMenu, hideMenu } from './views/menu.js';


function initDarkMode() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const storedTheme = localStorage.getItem('theme');
    const isDark = storedTheme === 'dark' || (!storedTheme && prefersDark);
    
    // Set initial state
    document.documentElement.classList.toggle('dark', isDark);
}

// Initialize dark mode and view when document is ready
$(document).ready(() => {
    initDarkMode();
    renderSubredditButtons();
    $('.menu-button').on('click', showMenu);

    // Cancel any ongoing speech synthesis on page load
    setTimeout(() => {
        window.speechSynthesis.cancel(); // Stop any ongoing speech
    }, 100); // Delay of 100 milliseconds

    // Check for speech state on page load
    const speechState = JSON.parse(localStorage.getItem('speechState'));
    if (speechState && speechState.state === 'playing') {
        const utterance = new SpeechSynthesisUtterance(speechState.text);
        window.speechSynthesis.speak(utterance);
        $('.play-button').hide(); // Hide play button
        $('.pause-button').show(); // Show pause button
    } else if (speechState && speechState.state === 'paused') {
        // If paused, show the play button
        $('.play-button').show();
        $('.pause-button').hide();
    }
});


// Utility functions
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

export function updateHeaders({ 
    mainText = '', 
    showBack = false,
    onBack = null
}) {
    // Main header
    $('#mainHeader .title').text(mainText);
    const $backButton = $('#mainHeader .back-button');
    $backButton.toggle(showBack);
    if (onBack) {
        $backButton.off('click').on('click', onBack);
    }
}

export function getWordCount(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).length;
}

export function formatReadingProgress(currentIndex, totalSentences, totalTime) {
    if (currentIndex === 0) return '0:00';
    
    const progress = (currentIndex / totalSentences);
    const secondsElapsed = Math.floor(totalTime * progress);
    
    if (secondsElapsed < 60) {
        return `0:${secondsElapsed.toString().padStart(2, '0')}`;
    } else {
        const minutes = Math.floor(secondsElapsed / 60);
        const seconds = secondsElapsed % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
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

// Add this helper to get seconds from reading time
export function getReadingTimeInSeconds(text) {
    if (!text) return 0;
    const words = text.trim().split(/\s+/).length;
    return Math.ceil(words / 3.9);
}