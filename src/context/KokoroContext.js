// import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
// import { KokoroTTS } from "https://cdn.jsdelivr.net/npm/kokoro-js/+esm";
//
// const KokoroContext = createContext(null);
//
// export function KokoroProvider({ children }) {
//   const [kokoroTTS, setKokoroTTS] = useState(null);
//   const [isInitializing, setIsInitializing] = useState(false);
//   const [error, setError] = useState(null);
//
//   // Audio state management
//   const audioContextRef = useRef(null);
//   const audioChunksRef = useRef([]);
//   const activeSourceRef = useRef(null);
//   const isStoppedRef = useRef(false);
//   const isPausedRef = useRef(false);
//   const currentChunkIndexRef = useRef(0);
//   const isStreamingRef = useRef(false);
//   const playbackPromiseRef = useRef(null);
//
//   // Add playback rate state
//   const [playbackRate, setPlaybackRate] = useState(1.0);
//
//   // Ref to track if initialization has already occurred
//   const hasInitializedRef = useRef(false);
//
//   // Initialize Kokoro
//   useEffect(() => {
//     async function initKokoro() {
//       if (kokoroTTS || isInitializing || hasInitializedRef.current) return;
//
//       setIsInitializing(true);
//       hasInitializedRef.current = true; // Set the ref to true to prevent re-initialization
//       try {
//         console.log("Starting Kokoro initialization...");
//         const model_id = "onnx-community/Kokoro-82M-v1.0-ONNX";
//
//         const tts = await KokoroTTS.from_pretrained(model_id, {
//           dtype: "fp32",
//           device: "webgpu",
//           vocoder_top_k: 128,
//           interpolate_text: true
//         });
//
//         console.log("Kokoro initialized successfully");
//         setKokoroTTS(tts);
//       } catch (err) {
//         console.error("Kokoro initialization failed:", err);
//         setError(err.message);
//       } finally {
//         setIsInitializing(false);
//       }
//     }
//
//     //initKokoro();
//   }, [kokoroTTS, isInitializing]); // Ensure dependencies are correct
//
//   // Initialize audio context
//   const getAudioContext = () => {
//     if (!audioContextRef.current) {
//       audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
//     }
//     return audioContextRef.current;
//   };
//
//   // Stop all audio and reset state
//   const stopAllAudio = () => {
//     console.log("STOP: Stopping all audio");
//     isStoppedRef.current = true;
//     isPausedRef.current = false;
//
//     // Stop active source
//     if (activeSourceRef.current) {
//       try {
//         activeSourceRef.current.stop();
//         activeSourceRef.current.disconnect();
//         console.log("STOP: Active source stopped");
//       } catch (e) {
//         console.error("STOP: Error stopping active source:", e);
//       }
//       activeSourceRef.current = null;
//     }
//
//     // Close and recreate audio context for a clean slate
//     if (audioContextRef.current) {
//       try {
//         audioContextRef.current.close();
//         console.log("STOP: Audio context closed");
//       } catch (e) {
//         console.error("STOP: Error closing audio context:", e);
//       }
//       audioContextRef.current = null;
//     }
//
//     return true;
//   };
//
//   // Pause audio playback
//   const pauseAudio = () => {
//     console.log(`PAUSE: Pausing audio at chunk ${currentChunkIndexRef.current}`);
//     isPausedRef.current = true;
//
//     // Pause active source
//     if (activeSourceRef.current) {
//       try {
//         activeSourceRef.current.stop();
//         console.log("PAUSE: Active source stopped for pause");
//       } catch (e) {
//         console.error("PAUSE: Error stopping active source:", e);
//       }
//       activeSourceRef.current = null;
//     }
//
//     return true;
//   };
//
//   // Resume audio playback from where it was paused
//   const resumeAudio = async () => {
//     console.log(`RESUME: Resuming audio from chunk ${currentChunkIndexRef.current}`);
//
//     if (!audioChunksRef.current || audioChunksRef.current.length === 0) {
//       console.error("RESUME: No audio chunks available");
//       return false;
//     }
//
//     isPausedRef.current = false;
//     isStoppedRef.current = false;
//
//     // Start playing from current chunk index (NOT incrementing it)
//     return playFromIndex(currentChunkIndexRef.current);
//   };
//
//   // Toggle play/pause
//   const togglePlayPause = async () => {
//     if (isPausedRef.current) {
//       return resumeAudio();
//     } else if (activeSourceRef.current) {
//       return pauseAudio();
//     } else if (audioChunksRef.current.length > 0) {
//       return resumeAudio();
//     }
//     return false;
//   };
//
//   // Check if audio is currently playing
//   const isPlaying = () => {
//     return activeSourceRef.current !== null && !isPausedRef.current;
//   };
//
//   // Check if audio is paused
//   const isPausedState = () => {
//     return isPausedRef.current;
//   };
//
//   // Play a single audio chunk
//   const playAudioChunk = (audioData, samplingRate) => {
//     return new Promise((resolve, reject) => {
//       try {
//         if (isStoppedRef.current) {
//           console.log("PLAY: Skipping playback as stopped flag is set");
//           resolve();
//           return;
//         }
//
//         if (isPausedRef.current) {
//           console.log("PLAY: Skipping playback as paused flag is set");
//           resolve();
//           return;
//         }
//
//         const audioContext = getAudioContext();
//         const audioBuffer = audioContext.createBuffer(1, audioData.length, samplingRate);
//         audioBuffer.getChannelData(0).set(audioData);
//
//         const source = audioContext.createBufferSource();
//         source.buffer = audioBuffer;
//         source.playbackRate.value = playbackRate;
//         source.connect(audioContext.destination);
//
//         // Store active source
//         activeSourceRef.current = source;
//
//         // Set up onended handler
//         source.onended = () => {
//           console.log("PLAY: Chunk playback ended normally");
//           if (activeSourceRef.current === source) {
//             activeSourceRef.current = null;
//           }
//           resolve();
//         };
//
//         // Start playback
//         source.start();
//         console.log("PLAY: Chunk playback started");
//       } catch (error) {
//         console.error("PLAY: Error setting up audio playback:", error);
//         if (activeSourceRef.current) {
//           activeSourceRef.current = null;
//         }
//         resolve(); // Resolve anyway to continue
//       }
//     });
//   };
//
//   // Sequential playback function
//   const playSequentially = async (startIndex) => {
//     if (startIndex < 0 || audioChunksRef.current.length === 0) return;
//
//     // Set the current chunk index
//     currentChunkIndexRef.current = startIndex;
//
//     for (let i = startIndex; i < audioChunksRef.current.length; i++) {
//       if (isStoppedRef.current) {
//         console.log("PLAY SEQ: Stopped, breaking playback loop");
//         break;
//       }
//       if (isPausedRef.current) {
//         console.log(`PLAY SEQ: Paused at chunk ${i}, saving index and breaking playback loop`);
//         // Keep the current chunk index as is - when we resume, we'll start from this same chunk
//         break;
//       }
//
//       const { audioData, samplingRate } = audioChunksRef.current[i];
//
//       // Update current index before playing the chunk
//       currentChunkIndexRef.current = i;
//       console.log(`PLAY SEQ: Playing chunk ${i + 1} of ${audioChunksRef.current.length}`);
//
//       // Play the chunk and wait for it to complete or be interrupted
//       await playAudioChunk(audioData, samplingRate);
//
//       // If we were paused during this chunk's playback, break the loop
//       // but don't increment the current chunk index
//       if (isPausedRef.current) {
//         console.log(`PLAY SEQ: Paused after playing chunk ${i}, keeping index and breaking loop`);
//         break;
//       }
//     }
//   };
//
//   // Stream and play audio - this is the main function that handles streaming
//   async function streamAndPlayAudio(text) {
//     if (!kokoroTTS) {
//       console.error("Kokoro TTS not initialized");
//       return false;
//     }
//
//     // Stop any existing audio and reset state
//     stopAllAudio();
//     audioChunksRef.current = [];
//     currentChunkIndexRef.current = 0;
//     isStoppedRef.current = false;
//     isPausedRef.current = false;
//     isStreamingRef.current = true;
//
//     console.log("STREAM: Starting to stream speech for text");
//     try {
//       // Get a fresh audio context
//       const audioContext = getAudioContext();
//       await audioContext.resume();
//
//       const { TextSplitterStream } = await import("https://cdn.jsdelivr.net/npm/kokoro-js/+esm");
//       const splitter = new TextSplitterStream();
//
//       console.log(splitter, 'splitterrrr')
//       const stream = kokoroTTS.stream(splitter, {
//         voice: "am_onyx"
//       });
//
//       // Start playback in a separate promise that we can track
//       playbackPromiseRef.current = playSequentially(0);
//
//       // Process stream in parallel with playback
//       (async () => {
//         try {
//           let chunkCount = 0;
//           for await (const chunk of stream) {
//             // Check if stopped
//             if (isStoppedRef.current) {
//               console.log("STREAM: Playback was stopped, exiting stream processing");
//               break;
//             }
//
//             if (chunk.audio && chunk.audio.audio && chunk.audio.audio.length > 0) {
//               const audioData = chunk.audio.audio;
//               const samplingRate = chunk.audio.sampling_rate || 24000;
//
//               // Add chunk to our collection
//               audioChunksRef.current.push({ audioData, samplingRate });
//               chunkCount++;
//
//               console.log(`STREAM: Added chunk ${chunkCount}, total chunks now: ${audioChunksRef.current.length}`);
//
//               // If this is the first chunk and we're not already playing, start playback
//               if (audioChunksRef.current.length === 1 && !activeSourceRef.current && !isPausedRef.current) {
//                 console.log("STREAM: Starting playback of first chunk");
//                 playbackPromiseRef.current = playSequentially(0);
//               }
//             }
//           }
//
//           console.log("STREAM: Stream processing completed, all chunks collected");
//           isStreamingRef.current = false;
//         } catch (streamError) {
//           console.error("STREAM: Error in stream processing:", streamError);
//           isStreamingRef.current = false;
//         }
//       })();
//
//       // Push tokens to stream
//       const tokens = text.match(/\s*\S+/g) || [text];
//       console.log(`STREAM: Pushing ${tokens.length} tokens to stream`);
//
//       for (const token of tokens) {
//         if (isStoppedRef.current) break;
//         splitter.push(token);
//         await new Promise(resolve => setTimeout(resolve, 20));
//       }
//
//       splitter.close();
//
//       // Wait for playback to complete
//       if (playbackPromiseRef.current) {
//         await playbackPromiseRef.current;
//       }
//
//       return true;
//     } catch (error) {
//       console.error("STREAM: Error setting up streaming:", error);
//       isStreamingRef.current = false;
//       return false;
//     }
//   }
//
//   // Play from a specific index
//   async function playFromIndex(index) {
//     console.log(`PLAY FROM: Attempting to play from index ${index}`);
//
//     if (!audioChunksRef.current || audioChunksRef.current.length === 0) {
//       console.error("PLAY FROM: No audio chunks available");
//       return false;
//     }
//
//     // Reset flags but keep chunks
//     isStoppedRef.current = false;
//     isPausedRef.current = false;
//
//     // Validate index
//     if (index < 0 || index >= audioChunksRef.current.length) {
//       console.error(`PLAY FROM: Invalid index ${index}. Available range: 0-${audioChunksRef.current.length - 1}`);
//       return false;
//     }
//
//     try {
//       // Play chunks sequentially from the specified index
//       await playSequentially(index);
//       return true;
//     } catch (error) {
//       console.error("PLAY FROM: Error during playback:", error);
//       return false;
//     }
//   }
//
//   // Get chunk count
//   function getAudioChunksCount() {
//     return audioChunksRef.current ? audioChunksRef.current.length : 0;
//   }
//
//   // Get current chunk index
//   function getCurrentChunkIndex() {
//     return currentChunkIndexRef.current;
//   }
//
//   // Check if currently streaming
//   function isStreaming() {
//     return isStreamingRef.current;
//   }
//
//   // Stream only without playing audio
//   async function streamOnly(allTextSentences) {
//     if (!kokoroTTS) {
//       console.error("Kokoro TTS not initialized");
//       return false;
//     }
//
//     // Stop any existing audio and reset state
//     stopAllAudio();
//     audioChunksRef.current = [];
//     currentChunkIndexRef.current = 0;
//     isStoppedRef.current = false;
//     isPausedRef.current = false;
//     isStreamingRef.current = true;
//
//     console.log("STREAM ONLY: Starting to stream speech for text");
//     try {
//       // Get a fresh audio context
//       const audioContext = getAudioContext();
//       await audioContext.resume();
//
//       const { TextSplitterStream } = await import("https://cdn.jsdelivr.net/npm/kokoro-js/+esm");
//       const splitter = new TextSplitterStream();
//
//       console.log(splitter, 'splitterrrr')
//
//       const stream = kokoroTTS.stream(splitter, {
//         voice: "am_onyx"
//       });
//
//       // Process stream without starting playback
//       (async () => {
//         try {
//           let chunkCount = 0;
//           for await (const chunk of stream) {
//             // Check if stopped
//             if (isStoppedRef.current) {
//               console.log("STREAM ONLY: Streaming was stopped, exiting stream processing");
//               break;
//             }
//
//             if (chunk.audio && chunk.audio.audio && chunk.audio.audio.length > 0) {
//               const audioData = chunk.audio.audio;
//               const samplingRate = chunk.audio.sampling_rate || 24000;
//
//               // Add chunk to our collection
//               audioChunksRef.current.push({ audioData, samplingRate });
//               chunkCount++;
//
//               console.log(`STREAM ONLY: Added chunk ${chunkCount}, total chunks now: ${audioChunksRef.current.length}`);
//             }
//           }
//
//           console.log("STREAM ONLY: Stream processing completed, all chunks collected");
//           isStreamingRef.current = false;
//         } catch (streamError) {
//           console.error("STREAM ONLY: Error in stream processing:", streamError);
//           isStreamingRef.current = false;
//         }
//       })();
//
//       // Push tokens to stream
//       //const tokens = text.match(/\s*\S+/g) || [text];
//       //console.log(`STREAM ONLY: Pushing ${tokens.length} tokens to stream`);
//
//       for (const token of allTextSentences) {
//         if (isStoppedRef.current) break;
//         splitter.push(token);
//         await new Promise(resolve => setTimeout(resolve, 20));
//       }
//
//       splitter.close();
//       return true;
//     } catch (error) {
//       console.error("STREAM ONLY: Error setting up streaming:", error);
//       isStreamingRef.current = false;
//       return false;
//     }
//   }
//
//   // Clean up on unmount
//   useEffect(() => {
//     return () => {
//       stopAllAudio();
//     };
//   }, []);
//
//   return (
//     <KokoroContext.Provider
//       value={{
//         kokoroTTS,
//         isInitializing,
//         error,
//         streamAndPlayAudio,
//         streamOnly,
//         playFromIndex,
//         pauseAudio,
//         resumeAudio,
//         togglePlayPause,
//         isPlaying,
//         isPaused: isPausedState,
//         isStreaming,
//         getAudioChunksCount,
//         getCurrentChunkIndex,
//         stopAllAudio,
//         playbackRate,
//         setPlaybackRate
//       }}
//     >
//       {children}
//     </KokoroContext.Provider>
//   );
// }
//
// export function useKokoro() {
//   return useContext(KokoroContext);
// }
