import React, { createContext, useState, useEffect, useContext, useRef } from 'react';

// Don't import directly, we'll handle it dynamically with better error handling
// import { KokoroTTS, TextSplitterStream } from "https://cdn.jsdelivr.net/npm/kokoro-js/+esm";

const KokoroContext = createContext(null);

const voices = {
  female: "af_bella",
  male: "am_onyx"
}

export function KokoroProvider({ children }) {
  const [kokoroTTS, setKokoroTTS] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState(null);

  // Audio state management
  const audioContextRef = useRef(null);
  const audioChunksRef = useRef([]);
  const activeSourceRef = useRef(null);
  const isStoppedRef = useRef(false);
  const isPausedRef = useRef(false);
  const currentChunkIndexRef = useRef(0);
  const isStreamingRef = useRef(false);
  const playbackPromiseRef = useRef(null);

  // Add playback rate state
  const [playbackRate, setPlaybackRate] = useState(1.0);

  // Ref to track if initialization has already occurred
  const hasInitializedRef = useRef(false);
  
  // Store the KokoroLib reference for use across functions
  const kokoroLibRef = useRef(null);

  // Browser compatibility detection
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const [browserCompatible, setBrowserCompatible] = useState(true); // Start optimistic
  const [errorSource, setErrorSource] = useState(null); // Track where errors occur
  const [runtimeError, setRuntimeError] = useState(null); // Track actual runtime error message
  
  // Global error handler for uncaught runtime errors
  useEffect(() => {
    // Function to handle uncaught errors
    const handleRuntimeError = (event) => {
      console.error('Runtime error captured:', event);
      
      // Extract error message
      const errorMessage = event.message || 'Unknown error';
      const errorStack = event.error && event.error.stack || '';
      
      // Only handle Kokoro-related errors
      if (errorMessage.includes('kokoro') || 
          errorStack.includes('kokoro') ||
          errorMessage.includes('undefined is not a function')) {
        
        // Prevent default browser error handling
        event.preventDefault();
        
        // Update state
        setRuntimeError(errorMessage);
        setBrowserCompatible(false);
        setErrorSource('runtime_error');
        
        // Log for debugging
        console.warn('Safari compatibility issue detected:', errorMessage);
      }
    };
    
    // Handle unhandled Promise rejections (like in the screenshot)
    const handlePromiseRejection = (event) => {
      console.error('Promise rejection captured:', event);
      
      // Get error details from the promise rejection
      const error = event.reason;
      const errorMessage = error ? (error.message || String(error)) : 'Unknown promise error';
      const errorStack = error && error.stack ? error.stack : '';
      
      // Check if this is the specific kokoro.web.js error from the screenshot
      if (errorMessage.includes('undefined is not a function') ||
          errorStack.includes('kokoro.web.js')) {
        
        // Prevent default handling
        event.preventDefault();
        
        // Set error state to trigger UI display
        setRuntimeError(`TypeScript Error: ${errorMessage}`);
        setBrowserCompatible(false);
        setErrorSource('promise_rejection');
        
        console.warn('Safari promise rejection detected:', errorMessage);
      }
    };
    
    // Add global error handlers
    window.addEventListener('error', handleRuntimeError);
    window.addEventListener('unhandledrejection', handlePromiseRejection);
    
    // Clean up
    return () => {
      window.removeEventListener('error', handleRuntimeError);
      window.removeEventListener('unhandledrejection', handlePromiseRejection);
    };
  }, []);
  
  // Initialize Kokoro
  useEffect(() => {
    async function initKokoro() {
      if (kokoroTTS || isInitializing || hasInitializedRef.current) return;

      setIsInitializing(true);
      hasInitializedRef.current = true; // Set the ref to true to prevent re-initialization
      
      try {
        console.log("Starting Kokoro initialization...");
        
        // Dynamic import with better error handling
        try {
          // Load the library and store in ref for use across component
          const importedLib = await import("https://cdn.jsdelivr.net/npm/kokoro-js/+esm");
          kokoroLibRef.current = importedLib;
          
          // Initial import successful
          console.log("Kokoro library import successful");
          setBrowserCompatible(true);
        } catch (importError) {
          console.error("Error loading Kokoro library:", importError);
          setBrowserCompatible(false);
          setErrorSource('import');
          setError("Failed to load Kokoro TTS library. This browser may not be compatible with ES modules from CDN.");
          setIsInitializing(false);
          return; // Exit initialization but don't throw
        }
        
        // Destructure after successful import
        const { KokoroTTS } = kokoroLibRef.current;

        // Check for webgpu support
        const device = 'gpu' in navigator ? 'webgpu' : 'wasm'; // Fallback to wasm if webgpu is not available

        console.log('dddddd', device, navigator)
        const model_id = "onnx-community/Kokoro-82M-v1.0-ONNX";

        const tts = await KokoroTTS.from_pretrained(model_id, {
          dtype: "fp32",
          device: device // Use the determined device
        });

        console.log("Kokoro initialized successfully");
        setKokoroTTS(tts);
      } catch (err) {
        console.error("Kokoro initialization failed:", err);
        setError(err.message);
      } finally {
        setIsInitializing(false);
      }
    }

    initKokoro();
  }, [kokoroTTS, isInitializing]); // Ensure dependencies are correct

  // Initialize audio context
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  // Stop all audio and reset state
  const stopAllAudio = () => {
    console.log("STOP: Stopping all audio");
    isStoppedRef.current = true;
    isPausedRef.current = false;

    // Stop active source
    if (activeSourceRef.current) {
      try {
        activeSourceRef.current.stop();
        activeSourceRef.current.disconnect();
        console.log("STOP: Active source stopped");
      } catch (e) {
        console.error("STOP: Error stopping active source:", e);
      }
      activeSourceRef.current = null;
    }

    // Close and recreate audio context for a clean slate
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
        console.log("STOP: Audio context closed");
      } catch (e) {
        console.error("STOP: Error closing audio context:", e);
      }
      audioContextRef.current = null;
    }

    return true;
  };

  // Pause audio playback
  const pauseAudio = () => {
    console.log(`PAUSE: Pausing audio at chunk ${currentChunkIndexRef.current}`);
    isPausedRef.current = true;

    // Pause active source
    if (activeSourceRef.current) {
      try {
        activeSourceRef.current.stop();
        console.log("PAUSE: Active source stopped for pause");
      } catch (e) {
        console.error("PAUSE: Error stopping active source:", e);
      }
      activeSourceRef.current = null;
    }

    return true;
  };

  // Resume audio playback from where it was paused
  const resumeAudio = async () => {
    console.log(`RESUME: Resuming audio from chunk ${currentChunkIndexRef.current}`);

    if (!audioChunksRef.current || audioChunksRef.current.length === 0) {
      console.error("RESUME: No audio chunks available");
      return false;
    }

    isPausedRef.current = false;
    isStoppedRef.current = false;

    // Start playing from current chunk index (NOT incrementing it)
    return playFromIndex(currentChunkIndexRef.current);
  };

  // Toggle play/pause
  const togglePlayPause = async () => {
    if (isPausedRef.current) {
      return resumeAudio();
    } else if (activeSourceRef.current) {
      return pauseAudio();
    } else if (audioChunksRef.current.length > 0) {
      return resumeAudio();
    }
    return false;
  };

  // Check if audio is currently playing
  const isPlaying = () => {
    return activeSourceRef.current !== null && !isPausedRef.current;
  };

  // Check if audio is paused
  const isPausedState = () => {
    return isPausedRef.current;
  };

  // Play a single audio chunk
  const playAudioChunk = (audioData, samplingRate) => {
    return new Promise((resolve, reject) => {
      try {
        if (isStoppedRef.current) {
          console.log("PLAY: Skipping playback as stopped flag is set");
          resolve();
          return;
        }

        if (isPausedRef.current) {
          console.log("PLAY: Skipping playback as paused flag is set");
          resolve();
          return;
        }

        const audioContext = getAudioContext();
        const audioBuffer = audioContext.createBuffer(1, audioData.length, samplingRate);
        audioBuffer.getChannelData(0).set(audioData);

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.playbackRate.value = playbackRate;
        source.connect(audioContext.destination);

        // Store active source
        activeSourceRef.current = source;

        // Set up onended handler
        source.onended = () => {
          console.log("PLAY: Chunk playback ended normally");
          if (activeSourceRef.current === source) {
            activeSourceRef.current = null;
          }
          resolve();
        };

        // Start playback
        source.start();
        console.log("PLAY: Chunk playback started");
      } catch (error) {
        console.error("PLAY: Error setting up audio playback:", error);
        if (activeSourceRef.current) {
          activeSourceRef.current = null;
        }
        resolve(); // Resolve anyway to continue
      }
    });
  };

  // Sequential playback function
  const playSequentially = async (startIndex) => {
    if (startIndex < 0 || audioChunksRef.current.length === 0) return;

    // Set the current chunk index
    currentChunkIndexRef.current = startIndex;

    for (let i = startIndex; i < audioChunksRef.current.length; i++) {
      if (isStoppedRef.current) {
        console.log("PLAY SEQ: Stopped, breaking playback loop");
        break;
      }
      if (isPausedRef.current) {
        console.log(`PLAY SEQ: Paused at chunk ${i}, saving index and breaking playback loop`);
        // Keep the current chunk index as is - when we resume, we'll start from this same chunk
        break;
      }

      const { audioData, samplingRate } = audioChunksRef.current[i];

      // Update current index before playing the chunk
      currentChunkIndexRef.current = i;
      console.log(`PLAY SEQ: Playing chunk ${i + 1} of ${audioChunksRef.current.length}`);

      // Play the chunk and wait for it to complete or be interrupted
      await playAudioChunk(audioData, samplingRate);

      // If we were paused during this chunk's playback, break the loop
      // but don't increment the current chunk index
      if (isPausedRef.current) {
        console.log(`PLAY SEQ: Paused after playing chunk ${i}, keeping index and breaking loop`);
        break;
      }
    }
  };

  // Combined function for streaming audio with optional playback
  // If sentences is an array, it uses those sentences, otherwise treats input as plain text
  // If playWhileStreaming is true, start playing as soon as chunks are available
  async function streamAudio(input, playWhileStreaming = false) {
    if (!kokoroTTS) {
      console.error("Kokoro TTS not initialized");
      return false;
    }

    // Determine if input is array of sentences or plain text
    const isArrayInput = Array.isArray(input);
    const textToStream = isArrayInput ? input : input.toString();
    
    // Stop any existing audio and reset state
    stopAllAudio();
    audioChunksRef.current = [];
    currentChunkIndexRef.current = 0;
    isStoppedRef.current = false;
    isPausedRef.current = false;
    isStreamingRef.current = true;

    // Create a log of processed items
    const processedItems = [];

    console.log(`STREAM: Starting to stream speech${playWhileStreaming ? ' and play' : ' only'}`);
    try {
      // Get a fresh audio context
      const audioContext = getAudioContext();
      await audioContext.resume();

      // Create TextSplitterStream instance with error handling
let splitter;
try {
  // Check if library is loaded
  if (!kokoroLibRef.current) {
    throw new Error("Kokoro library not loaded yet");
  }
  
  // Use the stored library reference
  const { TextSplitterStream } = kokoroLibRef.current;
  splitter = new TextSplitterStream();
  console.log("TextSplitterStream created successfully");
} catch (error) {
  console.error("Error creating TextSplitterStream:", error);
  setBrowserCompatible(false);
  setErrorSource('textSplitter');
  setError("Failed to initialize text stream. Browser compatibility issue.");
  setIsInitializing(false);
  return false; // Exit function but don't throw
}

      const stream = kokoroTTS.stream(splitter, {
        voice: voices.female,
        speed: playbackRate
      });

      // Process stream and handle playback based on flag
      (async () => {
        try {
          let chunkCount = 0;
          for await (const chunk of stream) {
            // Check if stopped
            if (isStoppedRef.current) {
              console.log("STREAM: Processing was stopped, exiting stream processing");
              break;
            }

            if (chunk.audio && chunk.audio.audio && chunk.audio.audio.length > 0) {
              const audioData = chunk.audio.audio;
              const samplingRate = chunk.audio.sampling_rate || 24000;

              // Add chunk to our collection
              audioChunksRef.current.push({ audioData, samplingRate });
              chunkCount++;

              console.log(`STREAM: Added chunk ${chunkCount}, total chunks now: ${audioChunksRef.current.length}`);

              // Log progress at milestones
              if (chunkCount === 1 || chunkCount === 5 || chunkCount === 10 || chunkCount % 10 === 0) {
                if (isArrayInput) {
                  console.log('SENTENCE PROGRESS:', processedItems.length, 'sentences processed');
                } else {
                  console.log('TOKEN PROGRESS:', processedItems.join(' '));
                }
              }

              // If playback is enabled, start playing as soon as first chunk is available
              if (playWhileStreaming && audioChunksRef.current.length === 1 && 
                 !activeSourceRef.current && !isPausedRef.current) {
                console.log("STREAM: Starting playback of first chunk");
                playbackPromiseRef.current = playSequentially(0);
              }
            }
          }

          console.log("STREAM: Stream processing completed, all chunks collected");
          isStreamingRef.current = false;
        } catch (streamError) {
          console.error("STREAM: Error in stream processing:", streamError);
          isStreamingRef.current = false;
        }
      })();

      // Push content to stream
      if (isArrayInput) {
        // Input is array of sentences
        for (let i = 0; i < textToStream.length; i++) {
          if (isStoppedRef.current) break;
          const sentence = textToStream[i];
          processedItems.push(sentence); // Add to our log
          console.log(`STREAM SENTENCE ${i+1}/${textToStream.length}:`, sentence.substring(0, 30) + '...');
          splitter.push(sentence);
          await new Promise(resolve => setTimeout(resolve, 20));
        }
      } else {
        // Input is plain text, split into tokens
        const tokens = textToStream.match(/\s*\S+/g) || [textToStream];
        console.log(`STREAM: Pushing ${tokens.length} tokens to stream`);

        for (let i = 0; i < tokens.length; i++) {
          if (isStoppedRef.current) break;
          const token = tokens[i];
          processedItems.push(token); // Add to our log
          console.log(`STREAM TOKEN ${i+1}/${tokens.length}:`, token);
          splitter.push(token);
          await new Promise(resolve => setTimeout(resolve, 20));
        }
      }

      splitter.close();

      // If playback was started and we want to wait for it to complete
      if (playWhileStreaming && playbackPromiseRef.current) {
        await playbackPromiseRef.current;
      }

      return true;
    } catch (error) {
      console.error("STREAM: Error setting up streaming:", error);
      isStreamingRef.current = false;
      return false;
    }
  }

  // Play from a specific index
  async function playFromIndex(index) {
    console.log(`PLAY FROM: Attempting to play from index ${index}`);

    if (!audioChunksRef.current || audioChunksRef.current.length === 0) {
      console.error("PLAY FROM: No audio chunks available");
      return false;
    }

    // Reset flags but keep chunks
    isStoppedRef.current = false;
    isPausedRef.current = false;

    // Validate index
    if (index < 0 || index >= audioChunksRef.current.length) {
      console.error(`PLAY FROM: Invalid index ${index}. Available range: 0-${audioChunksRef.current.length - 1}`);
      return false;
    }

    try {
      // Play chunks sequentially from the specified index
      await playSequentially(index);
      return true;
    } catch (error) {
      console.error("PLAY FROM: Error during playback:", error);
      return false;
    }
  }

  // Get chunk count
  function getAudioChunksCount() {
    return audioChunksRef.current ? audioChunksRef.current.length : 0;
  }

  // Get current chunk index
  function getCurrentChunkIndex() {
    return currentChunkIndexRef.current;
  }

  // Check if currently streaming
  function isStreaming() {
    return isStreamingRef.current;
  }

  // Backward compatibility wrappers
  async function streamAndPlayAudio(text) {
    return streamAudio(text, true);
  }
  
  async function streamOnly(sentences) {
    return streamAudio(sentences, false);
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, []);

  // Debug information for troubleshooting
  useEffect(() => {
    console.log("Current state:", {
      browserCompatible,
      isInitializing,
      kokoroTTS: !!kokoroTTS,
      error,
      errorSource,
      isSafari
    });
  }, [browserCompatible, isInitializing, kokoroTTS, error, errorSource, isSafari]);

  // Render content based on browser compatibility


  if (!browserCompatible && !isInitializing && !error) {
    setError("Browser needs WebGPU");
  }

  return (
    <KokoroContext.Provider
      value={{
        kokoroTTS,
        isInitializing,
        error,
        streamAndPlayAudio,
        streamOnly,
        playFromIndex,
        pauseAudio,
        resumeAudio,
        togglePlayPause,
        isPlaying,
        isPaused: isPausedState,
        isStreaming,
        getAudioChunksCount,
        getCurrentChunkIndex,
        stopAllAudio,
        playbackRate,
        setPlaybackRate
      }}
    >
      {children}
    </KokoroContext.Provider>
  );
}

export function useKokoro() {
  return useContext(KokoroContext);
}
