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
  onSliderEvent,
  speechSpeed,
  handleSpeedChange
}) {
  const changeSpeed = () => {

    if (speechSpeed === 1.0) {
      handleSpeedChange(1.5);
    } else if (speechSpeed === 1.5) {
      handleSpeedChange(2.0);
    } else if (speechSpeed === 2.0) {
      handleSpeedChange(0.5);
    } else if (speechSpeed === 0.5) {
      handleSpeedChange(1.0);
    }
  }

  return (
    <div className={`audio-controls card`}>
       <div className="audio-controls-top">
        <div className="audio-controls-top-left">
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
        {speechSpeed && (
          <button className="audio-controls-top-right" onClick={changeSpeed}>
            {speechSpeed}x
          </button>
        )}
      </div>
      <input
        type="range"
        className="content-slider"
        min={0}
        max={totalChunks > 0 ? totalChunks - 1 : 0}
        value={currentIndex}
        onChange={(e) => onSliderEvent(e.target.value)}
        aria-label="Progress slider"
      />
    </div>
  );
} 