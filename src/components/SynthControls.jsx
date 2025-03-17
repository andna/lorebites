import React, { useEffect, useRef } from 'react';
import { getReadingTime } from '../utils/formatters';
import { AudioControls } from './AudioControls';
import './SynthControls.css';

export function SynthControls({ 
  text, 
  contentRef, 
  currentIndex, 
  setCurrentIndex, 
  totalSentences 
}) {
  // State refs for speech synthesis
  const isPlayingRef = useRef(false);
  const progressTimerRef = useRef(null);
  const utteranceRef = useRef(null);
  const currentIndexRef = useRef(currentIndex);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const totalSeconds = getReadingTime(text, true);

  // Keep ref in sync with state
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Format time for display
  const formatTime = (seconds) => {
    if (seconds < 60) {
      return `0:${seconds.toString().padStart(2, '0')}`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  };
  
  // Cancel any ongoing speech and clean up
  const stopSpeech = () => {
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }
    
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    
    // Clear any highlighting
    if (contentRef.current) {
      const highlights = contentRef.current.querySelectorAll('.reading');
      highlights.forEach(el => el.classList.remove('reading'));
    }
    
    utteranceRef.current = null;
  };
  
  // Function to speak a specific sentence
  const speakSentence = (index) => {
    if (!contentRef.current) return;
    
    // Ensure index is valid
    if (index >= totalSentences) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      setCurrentIndex(0);
      return;
    }
    
    // Stop any ongoing speech first
    stopSpeech();
    
    // Update current index - this will be picked up by the parent to highlight
    setCurrentIndex(index);
    
    // Get the sentence
    const sentenceElements = contentRef.current.querySelectorAll('.sentence');
    const currentSentence = sentenceElements[index];
    
    if (!currentSentence) {
      console.error(`No sentence found at index ${index}`);
      return;
    }
    
    // Create and configure utterance
    const utterance = new SpeechSynthesisUtterance(currentSentence.textContent);
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find(a => a.name === "Google US English") || voices.find(a => a.name === "Moira");
    utteranceRef.current = utterance;
    
    // Start progress timer
    progressTimerRef.current = setInterval(() => {
      setElapsedSeconds(prev => {
        const newValue = prev + 1;
        if (newValue > totalSeconds + 30) {
          clearInterval(progressTimerRef.current);
        }
        return newValue;
      });
    }, 1000);
    
    // Handle speech end
    utterance.onend = () => {
      // Check if we're still playing (might have been paused/stopped)
      if (isPlayingRef.current) {
        const nextIndex = currentIndexRef.current + 1;
        if (nextIndex < totalSentences) {
          // Continue to next sentence
          setCurrentIndex(nextIndex);
          requestAnimationFrame(() => {
            speakSentence(nextIndex);
          });
        } else {
          // End of text
          setIsPlaying(false);
          isPlayingRef.current = false;
          clearInterval(progressTimerRef.current);
          progressTimerRef.current = null;
        }
      }
    };
    
    // Handle errors
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      clearInterval(progressTimerRef.current);
    };
    
    // Start speaking
    window.speechSynthesis.speak(utterance);
  };
  
  // Set up speech synthesis cleanup
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);
  
  // Handle click events on sentences
  useEffect(() => {
    if (!contentRef.current) return;
    
    const handleSentenceClick = (event) => {
      const sentenceElement = event.target.closest('.sentence');
      if (sentenceElement) {
        const index = parseInt(sentenceElement.getAttribute('data-index'), 10);
        if (!isNaN(index)) {
          stopSpeech();
          setIsPlaying(true);
          isPlayingRef.current = true;
          speakSentence(index);
        }
      }
    };
    
    contentRef.current.addEventListener('click', handleSentenceClick);
    
    return () => {
      if (contentRef.current) {
        contentRef.current.removeEventListener('click', handleSentenceClick);
      }
    };
  }, [totalSentences]);
  
  // Handle play button click
  const handlePlay = () => {
    if (totalSentences === 0) return;
    
    setIsPlaying(true);
    isPlayingRef.current = true;
    
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      
      // Restart the timer
      progressTimerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      // Start from current index (or from beginning if at the end)
      const startIndex = currentIndexRef.current >= totalSentences ? 0 : currentIndexRef.current;
      speakSentence(startIndex);
    }
  };
  
  // Handle pause button click
  const handlePause = () => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
    
    setIsPlaying(false);
    isPlayingRef.current = false;
    
    // Pause the timer
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };
  
  // Handle slider events (both during dragging and after release)
  const handleSlider = (newIndex) => {
    
    // Update displayed progress time in both cases
    const newElapsedSeconds = Math.floor((newIndex / totalSentences) * totalSeconds);
    setElapsedSeconds(newElapsedSeconds);
    
    stopSpeech();
    setIsPlaying(true);
    isPlayingRef.current = true;
    speakSentence(newIndex);
  };

  return (
    <AudioControls
      isPlaying={isPlaying}
      onPlay={handlePlay}
      onPause={handlePause}
      currentTime={formatTime(elapsedSeconds)}
      totalTime={getReadingTime(text)}
      currentIndex={currentIndex}
      totalChunks={totalSentences}
      onSliderEvent={handleSlider}
    />
  );
} 