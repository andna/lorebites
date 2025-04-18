import React, { useState, useEffect } from 'react';
import { useKokoro } from '../../context/KokoroContext';
import './KokoroPlayer.css';
import { AudioControls } from './AudioControls';

export function KokoroPlayer({ allTextSentences, currentIndex, setCurrentIndex }) {
  // Track previous sentences to detect post changes
  const prevSentencesRef = React.useRef([]);
  const {
    streamOnly,
    playFromIndex,
    getAudioChunksCount,
    stopAllAudio,
    isInitializing,
    error,
    togglePlayPause,
    isPlaying,
    isPaused,
    getCurrentChunkIndex,
    isStreaming,
    streamAndPlayAudio
  } = useKokoro();

  const [resumeIndex, setResumeIndex] = useState(3);
  const [playbackState, setPlaybackState] = useState('stopped'); // 'playing', 'paused', 'stopped'
  const [progressText, setProgressText] = useState('No audio available');
  const [isLoading, setIsLoading] = useState(false);
  // Detect changes in allTextSentences (new post loaded)
  useEffect(() => {
    // Simple check to detect if we have a new post
    const prevFirstSentence = prevSentencesRef.current[0] || '';
    const currentFirstSentence = allTextSentences[0] || '';
    
    // If first sentence has changed, we have a new post
    if (prevFirstSentence !== currentFirstSentence && allTextSentences.length > 0) {
      console.log('New post detected, clearing audio state and forcibly stopping any streaming');
      
      // Force stop streaming and reset loading state if active
      if (isLoading) {
        console.log('Interrupting active streaming process');
        setIsLoading(false);
      }
      
      // Clear any existing audio
      stopAllAudio();
      
      // Reset playback state to stopped
      setPlaybackState('stopped');
      
      // Update reference for next comparison
      prevSentencesRef.current = [...allTextSentences];
    }
  }, [allTextSentences, stopAllAudio, isLoading]);

  // Track current playback state outside the effect for better change detection
  const [isCurrentlyPlaying, setIsCurrentlyPlaying] = useState(false);
  const [hasAudioChunks, setHasAudioChunks] = useState(false);
  
  // Dedicated effect to turn off loading when playback starts
  useEffect(() => {
    if (isCurrentlyPlaying && hasAudioChunks && isLoading) {
      console.log('Audio playback detected, turning off loading indicator');
      setIsLoading(false);
    }
  }, [isCurrentlyPlaying, hasAudioChunks, isLoading]);
  
  // Update playback state and progress text regularly
  useEffect(() => {
    const updateState = () => {
      // Update playback state and track current state
      const currentlyPlaying = isPlaying();
      const currentlyPaused = isPaused();
      const chunks = getAudioChunksCount();
      
      setIsCurrentlyPlaying(currentlyPlaying);
      setHasAudioChunks(chunks > 0);
      
      if (currentlyPlaying) {
        setPlaybackState('playing');
      } else if (currentlyPaused) {
        setPlaybackState('paused');
      } else {
        setPlaybackState('stopped');
      }

      // Update progress text
      const total = getAudioChunksCount();
      const current = getCurrentChunkIndex();
      if (currentIndex !== current) {
        setCurrentIndex(current);
      }

      if (total === 0) {
        setProgressText('Stream first');
      } else if (isStreaming()) {
        setProgressText(`Streaming: ${total} chunks...`);
      } else {
        // Add 1 to indexes for display (1-based instead of 0-based)
        setProgressText(total + 1);
      }

    };

    // Update immediately
    updateState();

    // Set up interval to update regularly
    const interval = setInterval(updateState, 100);

    return () => clearInterval(interval);
  }, [isPlaying, isPaused, isStreaming, getAudioChunksCount, getCurrentChunkIndex]);

  // Handle Stream TTS button click
  const handleTestTTS = async () => {
    // Stop any existing audio first
    stopAllAudio();

    setIsLoading(true);
    await streamOnly(allTextSentences);
    // State will be updated by the effect
  };

  // Handle Play button
  const handlePlay = async () => {
    if (getAudioChunksCount() === 0) {
      // No chunks available, can't play
      alert('No audio chunks available. Stream the audio first.');
      return;
    }

    // Ensure any existing audio is completely stopped
    stopAllAudio();

    // Add a small delay to ensure audio context is properly reset
    await new Promise(resolve => setTimeout(resolve, 50));

    await playFromIndex(0);
  };


  const onSliderEvent = (newIndex) => {
    setResumeIndex(newIndex);
    handleResumeTTS(newIndex);
  }

  // Handle Resume From button click
  const handleResumeTTS = async (indexToResume) => {
    const chunksCount = getAudioChunksCount();
    if (chunksCount === 0) {
      alert('No audio chunks available. Stream the audio first.');
      return;
    }

    // Ensure any existing audio is completely stopped before starting new playback
    stopAllAudio();

    // Add a small delay to ensure audio context is properly reset
    await new Promise(resolve => setTimeout(resolve, 50));

    // Make sure the index is valid
    const index = Math.min(indexToResume, chunksCount - 1);
    console.log(`Starting playback from chunk ${index} of ${chunksCount}`);

    await playFromIndex(index);
  };

  // Handle Play/Pause toggle
  const handlePlayPause = async () => {
    if (playbackState === 'playing') {
      // Currently playing, so pause
      await togglePlayPause();
    } else if (playbackState === 'paused') {
      // Currently paused, just resume
      await togglePlayPause();
    } else {
      // Either no audio chunks, or we have chunks but we're stopped
      // Always stream TTS for a fresh start
      console.log('Play button pressed, streaming TTS');
      setIsLoading(true);
      
      // Clear any existing audio to ensure a fresh stream
      stopAllAudio();
      
      try {
        // Stream and play simultaneously
        // Note: We don't set isLoading=false here anymore
        // Instead, the useEffect that monitors playback state will handle it
        await streamAndPlayAudio(allTextSentences);
        console.log('TTS streaming complete');
        
        // If streaming completed but playing didn't start (rare edge case)
        if (isLoading && !isPlaying()) {
          console.log('Streaming completed but playback did not start');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error streaming TTS:', err);
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="kokoro-player">
      {isInitializing ? (
        <div className="loading-indicator">Initializing TTS...</div>
      ) : error ? (
        <div className="error-message">Kokoro Error: {error} <br></br> 
          <p>Use desktop Chrome or Edge, or change to Synth</p>
          <a target="_blank" href="https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX#voicessamples">Voice samples ↗️</a>
          </div>
      ) : (<div>
        {/*
            <div style={{display: "flex"}}>
               


                  <button
                    className={`tts-button play-pause-button ${playbackState} ${isLoading ? 'loading' : ''}`}
                    onClick={handlePlayPause}
                    disabled={isLoading}
                  >
                    {playbackState === 'playing' ? '⏸️ Pause' : '▶️ Play'}
                  </button>
                  <div className="progress-info">
                    {progressText}
                  </div>
                  
              

              </div>

              <div>

                <div className="resume-controls">
                  <button
                      className="tts-button"
                      onClick={() => {handleResumeTTS(resumeIndex)}}
                      disabled={resumeIndex >= getAudioChunksCount()}
                  >
                    Resume From
                  </button>
                  <input
                      type="number"
                      min="0"
                      max={Math.max(0, getAudioChunksCount() - 1)}
                      value={resumeIndex}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 0;
                        const max = Math.max(0, getAudioChunksCount() - 1);
                        setResumeIndex(Math.min(val, max));
                      }}
                      className="resume-index-input"
                      disabled={playbackState === 'playing'}
                  />
                </div>
 
        </div>
      */}

              <div className={`audio-controls-container ${isLoading ? 'is-loading' : ''}`}>
              <AudioControls
                    isPlaying={isPlaying()}
                    onPlay={handlePlayPause}
                    onPause={togglePlayPause}
                    currentTime={getCurrentChunkIndex() + 1}
                    totalTime={progressText}
                    currentIndex={resumeIndex}
                    totalChunks={getAudioChunksCount()}
                    onSliderEvent={onSliderEvent}
                  />
                  </div>
                 
        </div>
      )}
    </div>
  );
}
