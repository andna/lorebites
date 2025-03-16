import React, { useState, useEffect, useRef, useMemo } from 'react';
import { formatRelativeTime } from '../utils/formatters';
import { SynthControls } from './SynthControls';
import { KokoroPlayer } from './KokoroPlayer';
import './SinglePost.css';

export function SinglePost({ post, onBack }) {
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [processedContent, setProcessedContent] = useState('');
  const [totalSentences, setTotalSentences] = useState(0);
  const contentRef = useRef(null);
  
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
    setCurrentIndex(-1);
    
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
  
  // Highlight the current sentence whenever currentIndex changes
  useEffect(() => {
    if (!contentRef.current) return;
    
    // Function to apply highlighting
    const applyHighlighting = () => {
      // First remove all highlights
      const allSentences = contentRef.current.querySelectorAll('.sentence');
      allSentences.forEach(el => el.classList.remove('reading'));
      
      // Then apply the new highlight
      const currentSentence = contentRef.current.querySelector(`.sentence[data-index="${currentIndex}"]`);
      if (currentSentence) {
        currentSentence.classList.add('reading');
        
        // Ensure the class was applied
        if (!currentSentence.classList.contains('reading')) {
          // Fallback: use inline style if classList doesn't work
          currentSentence.style.backgroundColor = 'rgba(74, 144, 226, 0.2)';
        }
        
        // Scroll to the element
        currentSentence.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };
    
    // Apply highlighting immediately
    applyHighlighting();
    
    // And also after a short delay to catch any race conditions
    const timer = setTimeout(applyHighlighting, 50);
    
    return () => clearTimeout(timer);
  }, [currentIndex]);
  
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
        dangerouslySetInnerHTML={{ __html:  processedContent }}
      />
      
      <SynthControls
        text={post.selftext}
        contentRef={contentRef}
        currentIndex={Math.max(currentIndex, 0)}
        setCurrentIndex={setCurrentIndex}
        totalSentences={totalSentences}
      />

      <KokoroPlayer textToStream={post.selftext}/>
    </div>
  );
}
