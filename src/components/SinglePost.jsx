import React, { useState, useEffect, useRef } from 'react';
import { formatRelativeTime, getReadingTime, getReadingTimeInSeconds } from '../utils/formatters';
import './SinglePost.css';

export function SinglePost({ post, onBack }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [processedContent, setProcessedContent] = useState('');
  const [totalSentences, setTotalSentences] = useState(0);
  
  // Use refs to access current state in callbacks
  const currentIndexRef = useRef(0);
  const isPlayingRef = useRef(false);
  const progressTimerRef = useRef(null);
  const contentRef = useRef(null);
  const utteranceRef = useRef(null);
  const totalSeconds = getReadingTimeInSeconds(post.selftext);
  
  // Keep refs in sync with state
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);
  
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  
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
  
  // Process HTML content on component mount
  useEffect(() => {
    if (!post || !post.selftext_html) return;
    
    // Decode HTML
    const decodeHtml = (html) => {
      const txt = document.createElement('textarea');
      txt.innerHTML = html;
      return txt.value;
    };
    
    // Add target="_blank" to links
    const addTargetBlank = (html) => {
      return html.replace(/<a\s+(?![^>]*target=)([^>]*?)>/g, '<a target="_blank" $1>');
    };
    
    // Reset state when post changes
    setCurrentIndex(0);
    currentIndexRef.current = 0;
    setElapsedSeconds(0);
    setIsPlaying(false);
    isPlayingRef.current = false;
    
    // Process the HTML content
    const decodedHtml = decodeHtml(post.selftext_html.replace(/<!--.*?-->/g, ''));
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = decodedHtml;
    
    let sentenceCount = 0;
    
    // Process each paragraph and wrap sentences while preserving HTML
    Array.from(tempDiv.querySelectorAll('p')).forEach((p, pIndex) => {
      // First, collect all text content while preserving HTML structure
      let fullText = '';
      let htmlMap = [];  // Store HTML elements and their positions
      
      function collectText(node, inHtml = false) {
        if (node.nodeType === 3) { // Text node
          if (inHtml) {
            fullText += node.textContent;
          } else {
            const text = node.textContent;
            if (fullText && !fullText.endsWith(' ') && !text.startsWith(' ')) {
              fullText += ' ';
            }
            fullText += text;
          }
        } else if (node.nodeType === 1) { // Element node
          const tag = node.tagName.toLowerCase();
          const startPos = fullText.length;
          
          Array.from(node.childNodes).forEach(child => collectText(child, true));
          
          htmlMap.push({
            tag,
            startPos,
            endPos: fullText.length,
            attributes: Array.from(node.attributes).map(attr => ({
              name: attr.name,
              value: attr.value
            }))
          });
        }
      }
      
      Array.from(p.childNodes).forEach(node => collectText(node));
      
      let processedHtml = '';
      let lastEnd = 0;
      const sentenceMatches = fullText.match(/[^.!?]+[.!?]+/g) || [fullText];
      
      sentenceMatches.forEach((sentence, index) => {
        if (!sentence.trim()) return;
        
        let sentenceHtml = sentence;
        const startPos = fullText.indexOf(sentence, lastEnd);
        const endPos = startPos + sentence.length;
        
        htmlMap.forEach(({tag, startPos: tagStart, endPos: tagEnd, attributes}) => {
          if (tagStart >= startPos && tagEnd <= endPos) {
            const relativeStart = tagStart - startPos;
            const relativeEnd = tagEnd - startPos;
            const before = sentenceHtml.slice(0, relativeStart);
            const content = sentenceHtml.slice(relativeStart, relativeEnd);
            const after = sentenceHtml.slice(relativeEnd);
            
            let attrs = '';
            attributes.forEach(attr => {
              attrs += ` ${attr.name}="${attr.value}"`;
            });
            
            sentenceHtml = `${before}<${tag}${attrs}>${content}</${tag}>${after}`;
          }
        });
        
        processedHtml += `<span class="sentence" data-index="${sentenceCount}">${sentenceHtml}</span>`;
        sentenceCount++;
        lastEnd = endPos;
      });
      
      p.innerHTML = processedHtml;
    });
    
    const finalHtml = addTargetBlank(tempDiv.innerHTML);
    setProcessedContent(finalHtml);
    setTotalSentences(sentenceCount);
    
  }, [post]);
  
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
      currentIndexRef.current = 0;
      return;
    }
    
    // Stop any ongoing speech first
    stopSpeech();
    
    // Update current index
    setCurrentIndex(index);
    currentIndexRef.current = index;
    
    // Get and highlight the sentence
    const sentenceElements = contentRef.current.querySelectorAll('.sentence');
    const currentSentence = sentenceElements[index];
    
    if (!currentSentence) {
      console.error(`No sentence found at index ${index}`);
      return;
    }
    
    currentSentence.classList.add('reading');
    
    // Create and configure utterance
    const utterance = new SpeechSynthesisUtterance(currentSentence.textContent);
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
      // Remove highlight from current sentence
      currentSentence.classList.remove('reading');
      
      // Check if we're still playing (might have been paused/stopped)
      if (isPlayingRef.current) {
        const nextIndex = currentIndexRef.current + 1;
        if (nextIndex < totalSentences) {
          // Continue to next sentence
          setCurrentIndex(nextIndex);
          currentIndexRef.current = nextIndex;
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
      currentSentence.classList.remove('reading');
    };
    
    // Start speaking
    window.speechSynthesis.speak(utterance);
  };
  
  // Attach click handlers to sentences
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
  }, [processedContent, totalSentences]);
  
  // Set up speech synthesis cleanup
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);
  
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
  
  // Handle slider input (while dragging)
  const handleSliderInput = (e) => {
    const newIndex = parseInt(e.target.value);
    // Update displayed progress time while dragging
    const newElapsedSeconds = Math.floor((newIndex / totalSentences) * totalSeconds);
    setElapsedSeconds(newElapsedSeconds);
  };
  
  // Handle slider change (after dragging)
  const handleSliderChange = (e) => {
    const newIndex = parseInt(e.target.value);
    stopSpeech();
    setIsPlaying(true);
    isPlayingRef.current = true;
    speakSentence(newIndex);
  };
  
  // Handle back button
  const handleBack = () => {
    stopSpeech();
    onBack();
  };
  
  return (
    <div className="post-view">
      <div className="action-header">
        <div>
          <span>{formatRelativeTime(post.created_utc)} by </span>
          <i>u/{post.author}</i>
          <br />
          <span>in r/{post.subreddit}</span>
        </div>
        <div>
          <div>⤊ {post.score}</div>
          <div>☁ {post.num_comments}</div>
        </div>
        <div>
          <a
            href={post.url}
            title={post.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            ↗️
          </a>
        </div>
      </div>
      
      <div 
        className="post-content" 
        ref={contentRef}
        dangerouslySetInnerHTML={{ __html: processedContent }}
      />
      
      <div className="post-controls">
        <div className="post-controls-top">
          {!isPlaying ? (
            <button className="play-button" onClick={handlePlay}>▶️</button>
          ) : (
            <button className="pause-button" onClick={handlePause}>⏸️</button>
          )}
          <div className="reading-progress">
            {formatTime(elapsedSeconds)} / {getReadingTime(post.selftext)}
          </div>
        </div>
        <input
          type="range"
          className="content-slider"
          min={0}
          max={totalSentences > 0 ? totalSentences - 1 : 0}
          value={currentIndex}
          onChange={handleSliderChange}
          onInput={handleSliderInput}
        />
      </div>
    </div>
  );
}
