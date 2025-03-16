import React, { useState, useEffect } from 'react';
import { useKokoro } from '../context/KokoroContext';
import './KokoroPlayer.css';
import { AudioControls } from './AudioControls';

export function KokoroPlayer({ textToStream }) {
  const { 
    generateAndPlayAudio,
    streamAndPlayAudio,
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
    isStreaming
  } = useKokoro();
  
  const [resumeIndex, setResumeIndex] = useState(3);
  const [playbackState, setPlaybackState] = useState('stopped'); // 'playing', 'paused', 'stopped'
  const [progressText, setProgressText] = useState('No audio available');
  const [isLoading, setIsLoading] = useState(false);
  // Update playback state and progress text regularly
  useEffect(() => {
    const updateState = () => {
      // Update playback state
      if (isPlaying()) {
        setPlaybackState('playing');
      } else if (isPaused()) {
        setPlaybackState('paused');
      } else {
        setPlaybackState('stopped');
      }
      
      // Update progress text
      const total = getAudioChunksCount();
      const current = getCurrentChunkIndex();
      
      if (total === 0) {
        setProgressText('No audio available');
      } else if (isStreaming()) {
        setProgressText(`Streaming: ${total} chunks so far...`);
      } else {
        // Add 1 to indexes for display (1-based instead of 0-based)
        setProgressText(`Chunk ${current + 1} of ${total}`);
      }
      
      // Set loading state based on streaming status
      setIsLoading(isStreaming());
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
    await streamOnly(textToStream);
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
    } else if (playbackState === 'paused' || getAudioChunksCount() > 0) {
      // Currently paused or has chunks to play
      await togglePlayPause();
    } else {
      // No audio chunks, alert user
      alert('No audio chunks available. Stream the audio first.');
    }
  };
  
  // Add floating buttons for quick testing
  useEffect(() => {
    if (isInitializing || error) return;
    
    // Create test buttons
    const shortButton = document.createElement('button');
    shortButton.textContent = "Quick TTS";
    shortButton.className = "tts-short-button";
    Object.assign(shortButton.style, {
      position: 'fixed',
      bottom: '20px',
      right: '150px',
      padding: '10px 15px',
      background: '#28a745',
      color: 'white',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer'
    });
    shortButton.addEventListener('click', () => {
      // Stop any existing audio first
      stopAllAudio();
      const shortText = "For this example, let's pretend we're consuming text from an LLM, one word at a time.";
      generateAndPlayAudio(shortText);
    });
    
    const testButton = document.createElement('button');
    testButton.textContent = "Test TTS";
    testButton.className = "tts-test-button";
    Object.assign(testButton.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      padding: '10px 15px',
      background: '#4a6fa5',
      color: 'white',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer'
    });
    testButton.addEventListener('click', () => {
      // Stop any existing audio first
      stopAllAudio();
      streamAndPlayAudio(textToStream);
    });
    
    document.body.appendChild(shortButton);
    document.body.appendChild(testButton);
    
    return () => {
      document.body.removeChild(shortButton);
      document.body.removeChild(testButton);
    };
  }, [isInitializing, error, generateAndPlayAudio, streamAndPlayAudio, stopAllAudio]);

  return (
    <div className="kokoro-player">
      {isInitializing ? (
        <div className="loading-indicator">Initializing TTS...</div>
      ) : error ? (
        <div className="error-message">Error: {error}</div>
      ) : (
        <>
          <button 
            className="tts-button"
            onClick={handleTestTTS}
            disabled={isLoading || playbackState === 'playing'}
          >
            {isLoading ? 'Streaming...' : 'Stream TTS'}
          </button>
          
          <button 
            className="tts-button"
            onClick={handlePlay}
            disabled={isLoading || playbackState === 'playing' || getAudioChunksCount() === 0}
          >
            Play All
          </button>
          
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
          
          <button 
            className={`tts-button play-pause-button ${playbackState}`}
            onClick={handlePlayPause}
            disabled={getAudioChunksCount() === 0 && playbackState === 'stopped'}
          >
            {playbackState === 'playing' ? '⏸️ Pause' : '▶️ Play'}
          </button>
          
          <div className="progress-info">
            {progressText}
          </div>
          <AudioControls
            isPlaying={isPlaying()}
            onPlay={handlePlayPause}
            onPause={togglePlayPause}
            currentTime={getCurrentChunkIndex()}
            totalTime={getAudioChunksCount()}
            currentIndex={resumeIndex}
            totalChunks={getAudioChunksCount()}
            onSliderEvent={onSliderEvent}
          />



        </>
      )}
    </div>
  );
} 