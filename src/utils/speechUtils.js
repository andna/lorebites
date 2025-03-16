export class SpeechManager {
  constructor() {
    this.currentIndex = 0;
    this.isPlaying = false;
    this.progressTimer = null;
    this.utterance = null;
    this.totalSentences = 0;
    this.contentRef = null;
    this.onStateChange = null;
  }

  initialize(contentRef, totalSentences, onStateChange) {
    this.contentRef = contentRef;
    this.totalSentences = totalSentences;
    this.onStateChange = onStateChange;
  }

  stopSpeech() {
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }
    
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
    
    if (this.contentRef?.current) {
      const highlights = this.contentRef.current.querySelectorAll('.reading');
      highlights.forEach(el => el.classList.remove('reading'));
    }
    
    this.utterance = null;
  }

  speakSentence(index, totalSeconds) {
    if (!this.contentRef?.current) return;
    
    if (index >= this.totalSentences) {
      this.updateState({ isPlaying: false, currentIndex: 0 });
      return;
    }
    
    this.stopSpeech();
    this.updateState({ currentIndex: index });
    
    const sentenceElements = this.contentRef.current.querySelectorAll('.sentence');
    const currentSentence = sentenceElements[index];
    
    if (!currentSentence) {
      console.error(`No sentence found at index ${index}`);
      return;
    }
    
    currentSentence.classList.add('reading');
    
    const utterance = new SpeechSynthesisUtterance(currentSentence.textContent);
    this.utterance = utterance;
    
    this.startProgressTimer(totalSeconds);
    
    utterance.onend = () => {
      currentSentence.classList.remove('reading');
      
      if (this.isPlaying) {
        const nextIndex = this.currentIndex + 1;
        if (nextIndex < this.totalSentences) {
          this.updateState({ currentIndex: nextIndex });
          requestAnimationFrame(() => {
            this.speakSentence(nextIndex, totalSeconds);
          });
        } else {
          this.updateState({ isPlaying: false });
          clearInterval(this.progressTimer);
          this.progressTimer = null;
        }
      }
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      clearInterval(this.progressTimer);
      currentSentence.classList.remove('reading');
    };
    
    window.speechSynthesis.speak(utterance);
  }

  startProgressTimer(totalSeconds) {
    this.progressTimer = setInterval(() => {
      this.onStateChange(prev => ({
        ...prev,
        elapsedSeconds: prev.elapsedSeconds + 1 > totalSeconds + 30 
          ? prev.elapsedSeconds 
          : prev.elapsedSeconds + 1
      }));
    }, 1000);
  }

  updateState(newState) {
    this.currentIndex = newState.currentIndex ?? this.currentIndex;
    this.isPlaying = newState.isPlaying ?? this.isPlaying;
    this.onStateChange(prev => ({ ...prev, ...newState }));
  }

  play(totalSeconds) {
    if (this.totalSentences === 0) return;
    
    this.updateState({ isPlaying: true });
    
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      this.startProgressTimer(totalSeconds);
    } else {
      const startIndex = this.currentIndex >= this.totalSentences ? 0 : this.currentIndex;
      this.speakSentence(startIndex, totalSeconds);
    }
  }

  pause() {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
    
    this.updateState({ isPlaying: false });
    
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  cleanup() {
    this.stopSpeech();
  }
} 