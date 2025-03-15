import React, { useState, useEffect, useRef } from 'react';
import './Menu.css';

export function Menu({ isOpen, onClose, darkMode, setDarkMode }) {
  const [visible, setVisible] = useState(false);
  const menuDrawerRef = useRef(null);
  
  // Handle the menu animation
  useEffect(() => {
    if (isOpen) {
      // First make the overlay visible
      setVisible(true);
      // Then animate in the drawer after a frame
      const timeout = setTimeout(() => {
        if (menuDrawerRef.current) {
          menuDrawerRef.current.classList.add('open');
        }
      }, 10);
      return () => clearTimeout(timeout);
    } else {
      // First animate out the drawer
      if (menuDrawerRef.current) {
        menuDrawerRef.current.classList.remove('open');
      }
      // Then remove the overlay after animation completes
      const timeout = setTimeout(() => {
        setVisible(false);
      }, 300); // Match transition duration
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  // Handle the clear cache function
  const handleClearCache = () => {
    // Don't clear theme preference
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('reddit_posts_')) {
        localStorage.removeItem(key);
      }
    });
    onClose();
    window.location.reload();
  };

  // Handle the about information
  const handleAbout = () => {
    alert('Reddit Story Reader\nVersion 1.0.0');
  };

  // Handle dark mode toggle
  const handleDarkModeToggle = (e) => {
    const isDark = e.target.checked;
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    setDarkMode(isDark);
  };

  // Don't render anything if not visible
  if (!visible) return null;

  return (
    <div 
      id="menuOverlay" 
      className={visible ? 'visible' : ''} 
      onClick={onClose}
    >
      <div 
        id="menuDrawer" 
        ref={menuDrawerRef} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="menu-header">
          <h2>Menu</h2>
          <button className="close-menu" onClick={onClose}>×</button>
        </div>
        <div className="menu-content">
          <div className="menu-item">
            <span>🌙 Dark Mode</span>
            <label className="switch">
              <input 
                type="checkbox" 
                id="darkModeToggle" 
                checked={darkMode}
                onChange={handleDarkModeToggle}
              />
              <span className="slider"></span>
            </label>
          </div>
          <div className="menu-item" onClick={handleClearCache}>
            <span>🔄 Clear Cache</span>
          </div>
          <div className="menu-item" onClick={handleAbout}>
            <span>ℹ️ About</span>
          </div>
        </div>
      </div>
    </div>
  );
}
