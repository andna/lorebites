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
    //initKokoro();
});
console.log("Browser capabilities:", {
    hasWebGPU: 'gpu' in navigator,
    userAgent: navigator.userAgent,
    platform: navigator.platform
});

async function initKokoro() {
    try {
        console.log("Starting Kokoro initialization...");
        const model_id = "onnx-community/Kokoro-82M-v1.0-ONNX";
        
        // Log the device capabilities
        console.log("Browser capabilities:", {
            hasWebGPU: 'gpu' in navigator,
            userAgent: navigator.userAgent,
            platform: navigator.platform
        });
        
        kokoroTTS = await KokoroTTS.from_pretrained(model_id, {
            dtype: "fp32",
            device: "webgpu",  // This might be the issue on mobile
            vocoder_top_k: 128,
            interpolate_text: true
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
                const shortText = "For this example, let's pretend we're consuming text from an LLM, one word at a time."
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
                const text = `I sprinted through the cornfield, the stalks clawing at me like fingers. Behind me, I could hear them—smell the acrid burn of their torches.

The mob.

I clutched my child to my chest, the only thing she had left in the world. I, her mother, her protector.

Grief had already tried to pull me below, and for a time, I drowned in madness beneath the ruins of my life. The fever had stolen my whole kin, leaving just me and my babe.

They wanted to take her from me. From her own mother. They thought I wasn't fit to care for her. I couldn't let them. I pressed the small body, wrapped in a potato sack, close to my heart.

Crows burst from the stalks, black ink splattered against the gray sky. My lungs burned, my legs screamed in protest.

To my left, something tore through the corn, snapping stalks as it came. The dogs. Wicked beasts with teeth like rake tines, sniffing out my trail, eager to rip flesh from bone. They hadn't reached me yet, but they would.`;
                streamAndPlayAudio(text);
            });
            
        // Add the buttons to the page
        $('body').append($shortButton);
        $('body').append($button);
        
    } catch (error) {
        // Detailed error logging
        console.error("Kokoro initialization failed:", {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        alert(`Error initializing Kokoro: ${error.message}`);
        
        // Provide user-friendly message based on common errors
        if (error.message?.includes('WebGPU')) {
            alert("Your browser doesn't support WebGPU. Kokoro requires a browser with WebGPU support.");
        } else if (error.message?.includes('memory')) {
            alert("Not enough memory available. Try closing other tabs or restarting your browser.");
        }
    }
}

// Function to generate and play audio
export async function generateAndPlayAudio(text) {
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
        const result = await kokoroTTS.generate(text, {voice: "af_heart"});
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

// Modified streaming function
export async function streamAndPlayAudio(text) {
    // Add loading indicator
    const $loadingIndicator = $('<div>')
        .text("Streaming audio...")
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
    
    console.log("Streaming speech for: " + text);
    
    try {
        // Create audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        await audioContext.resume();
        
        // First, set up the stream
        const TextSplitterStream = (await import("https://cdn.jsdelivr.net/npm/kokoro-js/+esm")).TextSplitterStream;
        const splitter = new TextSplitterStream();
        const stream = kokoroTTS.stream(splitter, {voice: "am_onyx"});
        
        // Store audio chunks for sequential playback
        const audioChunks = [];
        let isPlaying = false;
        
        // Function to play the next chunk in queue
        const playNextChunk = async () => {
            if (audioChunks.length === 0 || isPlaying) {
                return;
            }
            
            isPlaying = true;
            const { audioData, samplingRate } = audioChunks.shift();
            
            try {
                const audioBuffer = audioContext.createBuffer(1, audioData.length, samplingRate);
                audioBuffer.getChannelData(0).set(audioData);
                
                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.destination);
                
                // When this chunk ends, play the next one
                source.onended = () => {
                    console.log("Chunk finished playing, moving to next chunk");
                    isPlaying = false;
                    playNextChunk();
                };
                
                source.start();
                console.log("Playing chunk, remaining in queue:", audioChunks.length);
            } catch (playError) {
                console.error("Error playing audio data:", playError);
                isPlaying = false;
                playNextChunk(); // Try the next chunk if there was an error
            }
        };
        
        // Process stream output and collect chunks
        (async () => {
            try {
                let chunkCount = 0;
                for await (const chunk of stream) {
                    console.log(`Received chunk ${chunkCount++}:`, chunk);
                    
                    // Based on console output, we need to access nested audio property
                    if (chunk.audio && chunk.audio.audio) {
                        console.log("Found nested audio data with length:", chunk.audio.audio.length);
                        
                        // Get the audio data and sampling rate
                        const audioData = chunk.audio.audio;
                        const samplingRate = chunk.audio.sampling_rate || 24000;
                        
                        // Add to playback queue
                        audioChunks.push({ audioData, samplingRate });
                        console.log("Added chunk to queue, queue length:", audioChunks.length);
                        
                        // Start playing if not already playing
                        playNextChunk();
                    } else {
                        console.warn("Could not find audio data in chunk:", chunk);
                    }
                }
                
                console.log("Stream processing completed");
                $loadingIndicator.text("Streaming complete");
                setTimeout(() => $loadingIndicator.remove(), 1000);
                
            } catch (streamError) {
                console.error("Error in stream processing:", streamError);
                $loadingIndicator.text("Streaming error").css("background", "rgba(255,0,0,0.7)");
                setTimeout(() => $loadingIndicator.remove(), 3000);
            }
        })();
        
        // Split text into tokens (words)
        const tokens = text.match(/\s*\S+/g);
        console.log(`Pushing ${tokens.length} tokens to stream`);
        
        // Push tokens to the stream with slight delays
        for (const token of tokens) {
            console.log("Pushing token:", token);
            splitter.push(token);
            // Small delay to allow UI to remain responsive
            await new Promise(resolve => setTimeout(resolve, 20));
        }
        
        // Close the stream to signal no more text
        console.log("Closing stream");
        splitter.close();
        
    } catch (error) {
        console.error("Error setting up streaming:", error);
        $loadingIndicator.text("Streaming setup error").css("background", "rgba(255,0,0,0.7)");
        setTimeout(() => $loadingIndicator.remove(), 3000);
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