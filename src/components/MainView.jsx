import React, { useState, useEffect, useRef } from 'react';
import { SubredditList } from './SubredditList';
import { PostsList } from './PostsList';
import { SinglePost } from './SinglePost';
import { Menu } from './Menu';
import { useKokoro } from '../context/KokoroContext';
import './MainView.css';

export function MainView() {
  const [view, setView] = useState('subreddits'); // 'subreddits', 'posts', 'post'
  const [currentSubreddit, setCurrentSubreddit] = useState(null);
  const [currentPost, setCurrentPost] = useState(null);
  const { 
    generateAndPlayAudio,
    streamAndPlayAudio, 
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [resumeIndex, setResumeIndex] = useState(3);
  const [playbackState, setPlaybackState] = useState('stopped'); // 'playing', 'paused', 'stopped'
  const [progressText, setProgressText] = useState('No audio available');
  
  const sampleText = `I sprinted through the cornfield, the stalks clawing at me like fingers. Behind me, I could hear them—smell the acrid burn of their torches.

The mob.

I clutched my child to my chest, the only thing she had left in the world. I, her mother, her protector.

Grief had already tried to pull me below, and for a time, I drowned in madness beneath the ruins of my life. The fever had stolen my whole kin, leaving just me and my babe.

They wanted to take her from me. From her own mother. They thought I wasn't fit to care for her. I couldn't let them. I pressed the small body, wrapped in a potato sack, close to my heart.

Crows burst from the stalks, black ink splattered against the gray sky. My lungs burned, my legs screamed in protest.

To my left, something tore through the corn, snapping stalks as it came. The dogs. Wicked beasts with teeth like rake tines, sniffing out my trail, eager to rip flesh from bone. They hadn't reached me yet, but they would.`;
  
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
      } else {
        // Add 1 to indexes for display (1-based instead of 0-based)
        setProgressText(`Chunk ${current + 1} of ${total}${isStreaming() ? ' (streaming...)' : ''}`);
      }
    };
    
    // Update immediately
    updateState();
    
    // Set up interval to update regularly
    const interval = setInterval(updateState, 100);
    
    return () => clearInterval(interval);
  }, [isPlaying, isPaused, isStreaming, getAudioChunksCount, getCurrentChunkIndex]);
  
  // Handle Test TTS button click
  const handleTestTTS = async () => {
    setPlaybackState('playing');
    await streamAndPlayAudio(sampleText);
    // State will be updated by the effect
  };
  
  // Handle Resume From button click
  const handleResumeTTS = async () => {
    const chunksCount = getAudioChunksCount();
    if (chunksCount === 0) {
      alert('No audio chunks available. Run the Test TTS first.');
      return;
    }
    
    // Make sure the index is valid
    const index = Math.min(resumeIndex, chunksCount - 1);
    
    await playFromIndex(index);
    // State will be updated by the effect
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
      // No audio chunks, start from beginning
      handleTestTTS();
    }
  };
  
  // Show the test buttons once Kokoro is initialized
  useEffect(() => {
    if (isInitializing || error) return;
    
    // Create test buttons similar to your original code
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
      const text = `I sprinted through the cornfield, the stalks clawing at me like fingers. Behind me, I could hear them—smell the acrid burn of their torches.

The mob.

I clutched my child to my chest, the only thing she had left in the world. I, her mother, her protector.

Grief had already tried to pull me below, and for a time, I drowned in madness beneath the ruins of my life. The fever had stolen my whole kin, leaving just me and my babe.

They wanted to take her from me. From her own mother. They thought I wasn't fit to care for her. I couldn't let them. I pressed the small body, wrapped in a potato sack, close to my heart.

Crows burst from the stalks, black ink splattered against the gray sky. My lungs burned, my legs screamed in protest.

To my left, something tore through the corn, snapping stalks as it came. The dogs. Wicked beasts with teeth like rake tines, sniffing out my trail, eager to rip flesh from bone. They hadn't reached me yet, but they would.`;
      streamAndPlayAudio(text);
    });
    
    document.body.appendChild(shortButton);
    document.body.appendChild(testButton);
    
    return () => {
      document.body.removeChild(shortButton);
      document.body.removeChild(testButton);
    };
  }, [isInitializing, error, generateAndPlayAudio, streamAndPlayAudio]);
  
  useEffect(() => {
    // Get the test button
    const testButton = document.getElementById('testTTSButton');
    if (testButton) {
      testButton.addEventListener('click', () => {
        const text = `I sprinted through the cornfield, the stalks clawing at me like fingers. Behind me, I could hear them—smell the acrid burn of their torches.

The mob.

I clutched my child to my chest, the only thing she had left in the world. I, her mother, her protector.

Grief had already tried to pull me below, and for a time, I drowned in madness beneath the ruins of my life. The fever had stolen my whole kin, leaving just me and my babe.

They wanted to take her from me. From her own mother. They thought I wasn't fit to care for her. I couldn't let them. I pressed the small body, wrapped in a potato sack, close to my heart.

Crows burst from the stalks, black ink splattered against the gray sky. My lungs burned, my legs screamed in protest.

To my left, something tore through the corn, snapping stalks as it came. The dogs. Wicked beasts with teeth like rake tines, sniffing out my trail, eager to rip flesh from bone. They hadn't reached me yet, but they would.`;
        streamAndPlayAudio(text);
      });
    }
    
    // Add the resume button
    const resumeButton = document.getElementById('resumeTTSButton');
    if (resumeButton) {
      resumeButton.addEventListener('click', () => {
        const chunksCount = getAudioChunksCount();
        if (chunksCount === 0) {
          alert('No audio chunks available. Run the Test TTS first.');
          return;
        }
        
        // Make sure the index is valid
        const index = Math.min(resumeIndex, chunksCount - 1);
        console.log(`Resuming from chunk ${index} of ${chunksCount}`);
        playFromIndex(index);
      });
    }
    
    // Add the index input
    const indexInput = document.getElementById('resumeIndexInput');
    if (indexInput) {
      indexInput.addEventListener('change', (e) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value) && value >= 0) {
          setResumeIndex(value);
        }
      });
    }
  }, [streamAndPlayAudio, playFromIndex, getAudioChunksCount, resumeIndex]);

  return (
    <div className="app-container">
      <header id="mainHeader">
        <div className="back-button" 
             style={{display: view !== 'subreddits' ? 'block' : 'none'}}
             onClick={() => {
               if (view === 'post') setView('posts');
               else setView('subreddits');
             }}>
          &lt; Back
        </div>
        <div className="title">
          {view === 'subreddits' ? 'Subreddits' : 
           view === 'posts' ? currentSubreddit?.name : 
           currentPost?.title || ''}
        </div>
        <div className="menu-button" onClick={() => setMenuOpen(true)}>☰</div>
      </header>
      <Menu 
        isOpen={menuOpen} 
        onClose={() => setMenuOpen(false)} 
        darkMode={darkMode} 
        setDarkMode={setDarkMode}
      />
      <main>
        {view === 'subreddits' && (
          <SubredditList onSelectSubreddit={(sub) => {
            setCurrentSubreddit(sub);
            setView('posts');
          }} />
        )}
        
        {view === 'posts' && currentSubreddit && (
          <PostsList 
            subreddit={currentSubreddit}
            onSelectPost={(post) => {
              setCurrentPost(post);
              setView('post');
            }}
          />
        )}
        
        {view === 'post' && currentPost && (
          <SinglePost post={currentPost} />
        )}
      </main>
      
      <div className="tts-controls">
        {isInitializing ? (
          <div className="loading-indicator">Initializing TTS...</div>
        ) : error ? (
          <div className="error-message">Error: {error}</div>
        ) : (
          <>
            <button 
              className="tts-button"
              onClick={handleTestTTS}
              disabled={playbackState === 'playing'}
            >
              Test TTS
            </button>
            
            <div className="resume-controls">
              <button 
                className="tts-button"
                onClick={handleResumeTTS}
                disabled={playbackState === 'playing' || getAudioChunksCount() === 0}
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
            >
              {playbackState === 'playing' ? '⏸️ Pause' : '▶️ Play'}
            </button>
            
            <div className="progress-info">
              {progressText}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
