import React, { createContext, useState, useEffect, useContext } from 'react';
import { KokoroTTS } from "https://cdn.jsdelivr.net/npm/kokoro-js/+esm";

const KokoroContext = createContext(null);

export function KokoroProvider({ children }) {
  const [kokoroTTS, setKokoroTTS] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    async function initKokoro() {
      if (kokoroTTS || isInitializing) return;
      
      setIsInitializing(true);
      try {
        console.log("Starting Kokoro initialization...");
        const model_id = "onnx-community/Kokoro-82M-v1.0-ONNX";
        
        // Log the device capabilities
        console.log("Browser capabilities:", {
          hasWebGPU: 'gpu' in navigator,
          userAgent: navigator.userAgent,
          platform: navigator.platform
        });
        
        const tts = await KokoroTTS.from_pretrained(model_id, {
          dtype: "fp32",  // Use q8 for mobile compatibility
          device: "webgpu",  // Use WASM for broader device support
          vocoder_top_k: 128,
          interpolate_text: true
        });
        
        console.log("Kokoro initialized successfully");
        setKokoroTTS(tts);
      } catch (err) {
        console.error("Kokoro initialization failed:", {
          message: err.message,
          stack: err.stack,
          name: err.name
        });
        setError(err.message);
      } finally {
        setIsInitializing(false);
      }
    }
    
    initKokoro();
  }, []);
  
  async function generateAndPlayAudio(text, voice = "af_heart") {
    if (!kokoroTTS) return;
    
    console.log("Generating speech for: " + text);
    try {
      const result = await kokoroTTS.generate(text, {voice});
      console.log("Generated result with length:", result.audio.length);

      const samplingRate = result.sampling_rate || 24000;
      
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
      return true;
    } catch (error) {
      console.error("Error generating or playing audio:", error);
      return false;
    } finally {
      console.log("Audio generation completed");
    }
  }
  
  async function streamAndPlayAudio(text, options = {}) {
    if (!kokoroTTS) return false;
    
    const { onComplete } = options || {};
    
    console.log("Streaming speech for: " + text);

    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      await audioContext.resume();
      
      const { TextSplitterStream } = await import("https://cdn.jsdelivr.net/npm/kokoro-js/+esm");
      const splitter = new TextSplitterStream();
      
      // Use the correct voice format
      const stream = kokoroTTS.stream(splitter, {
        voice: "am_onyx"
      });
      
      // Keep all chunks and track current playing index
      const audioChunks = [];
      let currentPlayIndex = 0;
      let isPlaying = false;
      let playbackFinished = false;
      
      const playChunkAtIndex = async (index) => {
        if (index >= audioChunks.length || isPlaying) return;
        
        isPlaying = true;
        const { audioData, samplingRate } = audioChunks[index];
        
        try {
          const audioBuffer = audioContext.createBuffer(1, audioData.length, samplingRate);
          audioBuffer.getChannelData(0).set(audioData);
          
          const source = audioContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioContext.destination);
          
          source.onended = () => {
            console.log(`Chunk ${index} finished playing, moving to next chunk`);
            isPlaying = false;
            
            // Move to next chunk
            currentPlayIndex++;
            
            // Check if we've reached the end
            if (currentPlayIndex >= audioChunks.length) {
              if (playbackFinished && onComplete) {
                console.log("All chunks played, calling onComplete");
                onComplete();
              }
              return;
            }
            
            // Play the next chunk
            playChunkAtIndex(currentPlayIndex);
          };
          
          source.start();
          console.log(`Playing chunk ${index}, total chunks: ${audioChunks.length}`);

        } catch (playError) {
          console.error(`Error playing audio chunk ${index}:`, playError);
          isPlaying = false;
          
          // Try to recover by moving to next chunk
          currentPlayIndex++;
          if (currentPlayIndex < audioChunks.length) {
            playChunkAtIndex(currentPlayIndex);
          } else if (playbackFinished && onComplete) {
            onComplete();
          }
        }
      };
      
      // Process stream
      (async () => {
        try {
          let chunkCount = 0;
          for await (const chunk of stream) {
            console.log(`Received chunk ${chunkCount++}:`, chunk);

            if (chunk.audio && chunk.audio.audio && chunk.audio.audio.length > 0) {
              console.log("Found audio data with length:", chunk.audio.audio.length);

              const audioData = chunk.audio.audio;
              const samplingRate = chunk.audio.sampling_rate || 24000;
              
              // Add to our collection
              audioChunks.push({ audioData, samplingRate });
              console.log("Added chunk to collection, total chunks:", audioChunks.length);

              // If this is the first chunk or we're not currently playing, start playback
              if (audioChunks.length === 1 || !isPlaying) {
                playChunkAtIndex(currentPlayIndex);
              }
            } else {
              console.warn("Empty audio chunk received:", chunk);
            }
          }
          
          console.log("Stream processing completed");
          playbackFinished = true;
          
          // If we've already played all chunks, call onComplete
          if (currentPlayIndex >= audioChunks.length && onComplete) {
            console.log("All chunks already played, calling onComplete");
            onComplete();
          }
        } catch (streamError) {
          console.error("Error in stream processing:", streamError);
          if (onComplete) onComplete();
        }
      })();
      
      // Push tokens to stream
      const tokens = text.match(/\s*\S+/g) || [text];
      console.log(`Pushing ${tokens.length} tokens to stream`);

      for (const token of tokens) {
        console.log("Pushing token:", token);
        splitter.push(token);
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      
      splitter.close();
      return true;
    } catch (error) {
      console.error("Error setting up streaming:", error);
      if (onComplete) onComplete();
      return false;
    }
  }
  
  return (
    <KokoroContext.Provider 
      value={{ 
        kokoroTTS, 
        isInitializing, 
        error, 
        generateAndPlayAudio, 
        streamAndPlayAudio 
      }}
    >
      {children}
    </KokoroContext.Provider>
  );
}

export function useKokoro() {
  return useContext(KokoroContext);
}
