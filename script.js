import { renderSubredditButtons } from './views/main.js';
import { showMenu } from './views/menu.js';
import { KokoroTTS } from "https://cdn.jsdelivr.net/npm/kokoro-js/+esm";

// Initialize variable to store the TTS instance
let kokoroTTS = null;

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
    $('.demo').on('click', initKokoro);

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

    // Initialize Kokoro
    initKokoro();
});

async function initKokoro() {
    try {
        console.log("Initializing Kokoro");
        const model_id = "onnx-community/Kokoro-82M-v1.0-ONNX";
        kokoroTTS = await KokoroTTS.from_pretrained(model_id, {
            dtype: "fp32",
            device: "webgpu"
        });
        
        console.log("Kokoro initialized successfully");
        
        // Add button with shorter text option
        const $shortButton = $('<button>')
            .text("Quick TTS")
            .addClass("tts-short-button")
            .css({
                position: 'fixed',
                bottom: '20px',
                right: '150px',
                padding: '10px 15px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
            })
            .on('click', async () => {
                const shortText = "For this example, let's pretend we're consuming text from an LLM, one word at a time.
                generateAndPlayAudio(shortText);
            });
            
        // Add original test button
        const $button = $('<button>')
            .text("Test TTS")
            .addClass("tts-test-button")
            .css({
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                padding: '10px 15px',
                background: '#4a6fa5',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
            })
            .on('click', async () => {
                const text = "This is a test of the Kokoro text to speech system.";
                generateAndPlayAudio(text);
            });
            
        // Add the buttons to the page
        $('body').append($shortButton);
        $('body').append($button);
        
    } catch (error) {
        console.error("Error initializing Kokoro:", error);
    }
}

// Function to generate and play audio
async function generateAndPlayAudio(text) {
    // Add loading indicator
    const $loadingIndicator = $('<div>')
        .text("Generating audio...")
        .css({
            position: 'fixed',
            bottom: '70px',
            right: '20px',
            padding: '5px 10px',
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            borderRadius: '3px'
        });
    $('body').append($loadingIndicator);
    
    console.log("Generating speech for: " + text);
    
    try {
        // Small delay to update UI
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Generate the audio
        const result = await kokoroTTS.generate(text);
        console.log("Generated result with length:", result.audio.length);
        
        // Use the correct sampling rate
        const samplingRate = result.sampling_rate || 24000;
        
        // Play the audio
        if (result.audio && result.audio.length) {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const audioBuffer = audioContext.createBuffer(1, result.audio.length, samplingRate);
            audioBuffer.getChannelData(0).set(result.audio);
            
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start();
            console.log("Audio playback started");
        }
    } catch (error) {
        console.error("Error generating or playing audio:", error);
        $loadingIndicator.text("Error generating audio").css("background", "rgba(255,0,0,0.7)");
    } finally {
        // Remove loading indicator after a short delay
        setTimeout(() => $loadingIndicator.remove(), 1000);
    }
}

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

// Create the worker
const ttsWorker = new Worker('tts-worker.js');

// Setup message handling
ttsWorker.onmessage = function(e) {
  const { type, audio, samplingRate, error } = e.data;
  
  if (type === 'initialized') {
    console.log('TTS model initialized in worker');
  }
  else if (type === 'result') {
    // Play the audio
    const audioContext = new AudioContext();
    const audioBuffer = audioContext.createBuffer(1, audio.length, samplingRate);
    audioBuffer.getChannelData(0).set(audio);
    
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();
  }
  else if (type === 'error') {
    console.error('Worker error:', error);
  }
};

// Initialize the model in the worker
ttsWorker.postMessage({ 
  type: 'init', 
  modelId: 'onnx-community/Kokoro-82M-v1.0-ONNX' 
});

// Later, generate speech
function generateSpeech(text) {
  ttsWorker.postMessage({ type: 'generate', text });
}