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
  
  async function streamAndPlayAudio(text, voice = "am_onyx") {
    if (!kokoroTTS) return;
    
    console.log("Streaming speech for: " + text);

    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      await audioContext.resume();
      
      const { TextSplitterStream } = await import("https://cdn.jsdelivr.net/npm/kokoro-js/+esm");
      const splitter = new TextSplitterStream();
      const stream = kokoroTTS.stream(splitter, {voice});
      
      // Use the same sequential playback logic you've already implemented
      const audioChunks = [];
      let isPlaying = false;
      
      const playNextChunk = async () => {
        if (audioChunks.length === 0 || isPlaying) return;
        
        isPlaying = true;
        const { audioData, samplingRate } = audioChunks.shift();
        
        try {
          const audioBuffer = audioContext.createBuffer(1, audioData.length, samplingRate);
          audioBuffer.getChannelData(0).set(audioData);
          
          const source = audioContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioContext.destination);
          
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
          playNextChunk();
        }
      };
      
      // Process stream
      (async () => {
        try {
            let chunkCount = 0;
          for await (const chunk of stream) {
            console.log(`Received chunk ${chunkCount++}:`, chunk);

            if (chunk.audio && chunk.audio.audio) {
                console.log("Found nested audio data with length:", chunk.audio.audio.length);

              const audioData = chunk.audio.audio;
              const samplingRate = chunk.audio.sampling_rate || 24000;
              
              audioChunks.push({ audioData, samplingRate });
              console.log("Added chunk to queue, queue length:", audioChunks.length);

              playNextChunk();
            } else {
                console.warn("Could not find audio data in chunk:", chunk);
            }
          }
          console.log("Stream processing completed");

        } catch (streamError) {
          console.error("Error in stream processing:", streamError);
        }
      })();
      
      // Push tokens to stream
      const tokens = text.match(/\s*\S+/g);
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
