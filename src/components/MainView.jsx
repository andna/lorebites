import React, { useState, useEffect } from 'react';
import { SubredditList } from './SubredditList';
import { PostsList } from './PostsList';
import { SinglePost } from './SinglePost';
import { Menu } from './Menu';
import { useKokoro } from '../context/KokoroContext';

export function MainView() {
  const [view, setView] = useState('subreddits'); // 'subreddits', 'posts', 'post'
  const [currentSubreddit, setCurrentSubreddit] = useState(null);
  const [currentPost, setCurrentPost] = useState(null);
  const { isInitializing, error, generateAndPlayAudio, streamAndPlayAudio } = useKokoro();
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
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
      
    </div>
  );
}
