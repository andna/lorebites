import React, { useEffect, useState } from 'react';
import { MainView } from './components/MainView';
import { KokoroProvider } from './context/KokoroContext';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  
  useEffect(() => {
    // Initialize dark mode from your existing logic
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const storedTheme = localStorage.getItem('theme');
    const isDark = storedTheme === 'dark' || (!storedTheme && prefersDark);
    setDarkMode(isDark);
    
    // Apply the dark mode class to the root element
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  return (
    <KokoroProvider>
      <MainView darkMode={darkMode} setDarkMode={setDarkMode} />
    </KokoroProvider>
  );
}

export default App;
