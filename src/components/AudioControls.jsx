import React from 'react';
import './AudioControls.css';

export function AudioControls({
  isPlaying,
  onPlay,
  onPause,
  currentTime,
  totalTime,
  currentIndex,
  totalChunks,
  onSliderChange,
  onSliderInput,
  className = ''
}) {
  return (
    <div className={`audio-controls ${className}`}>
      <div className="audio-controls-top">
        {!isPlaying ? (
          <button 
            className="play-button" 
            onClick={onPlay}
            aria-label="Play"
          >
            ▶️
          </button>
        ) : (
          <button 
            className="pause-button" 
            onClick={onPause}
            aria-label="Pause"
          >
            ⏸️
          </button>
        )}
        <div className="reading-progress">
          {currentTime} / {totalTime}
        </div>
      </div>
      <input
        type="range"
        className="content-slider"
        min={0}
        max={totalChunks > 0 ? totalChunks - 1 : 0}
        value={currentIndex}
        onChange={onSliderChange}
        onInput={onSliderInput}
        aria-label="Progress slider"
      />
    </div>
  );
} 