import React, { useState, useEffect, useRef, useMemo } from 'react';
import { formatRelativeTime } from '../../utils/formatters';
import { SynthControls } from '../AudioPlayers/SynthControls';
import { KokoroPlayer } from '../AudioPlayers/KokoroPlayer';
import { CommentsList } from './CommentsList';
import { SummaryGenerator } from './SummaryGenerator';
import './SinglePost.css';
import './SinglePostTabs.css';

// Function to get storage key for caching post data
const getPostStorageKey = (subredditName, postId) => {
  return `reddit_post_${subredditName}_${postId}`.toLowerCase();
};

// Function to get cached post data
const getCachedPost = (subredditName, postId) => {
  const key = getPostStorageKey(subredditName, postId);
  const cached = localStorage.getItem(key);

  if (!cached) return null;

  try {
    const { post, timestamp } = JSON.parse(cached);
    const isExpired = Date.now() - timestamp > (60000 * 30); // 30 minutes in milliseconds

    if (isExpired) {
      console.log(`Cached post data expired, removing from cache`);
      localStorage.removeItem(key);
      return null;
    }

    console.log(`Using cached post data, cache age: ${Math.round((Date.now() - timestamp) / 60000)} minutes`);
    return post;
  } catch (err) {
    console.error('Error parsing cached post data:', err);
    localStorage.removeItem(key);
    return null;
  }
};

// Function to cache post data
const cachePost = (subredditName, postId, post) => {
  if (!subredditName || !postId) return;

  const key = getPostStorageKey(subredditName, postId);
  const data = {
    post,
    timestamp: Date.now()
  };

  try {
    localStorage.setItem(key, JSON.stringify(data));
    console.log(`Post data cached successfully`);
  } catch (err) {
    console.error('Error caching post data:', err);
    // Clean up older caches if needed
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('reddit_post_')) {
          keysToRemove.push(key);
        }
      }

      // Remove oldest caches first (keep newest 10)
      if (keysToRemove.length > 10) {
        const itemsToRemove = keysToRemove.slice(0, keysToRemove.length - 10);
        itemsToRemove.forEach(key => localStorage.removeItem(key));
        console.log(`Removed ${itemsToRemove.length} old post caches`);
      }
    } catch (e) {
      console.error('Error cleaning up cache:', e);
    }
  }
};

export function SinglePost({ post: propPost }) {
  const [post, setPost] = useState(propPost);
  const [loading, setLoading] = useState(!propPost);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [processedContent, setProcessedContent] = useState('');
  const [totalSentences, setTotalSentences] = useState(0);
  const [allTextSentences, setAllTextSentences] = useState([]);
  const [activeTab, setActiveTab] = useState('player');
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
    setAllTextSentences([]);

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
        const capitalizeFirstLetter = (str) => {
          // Find the first letter using regex
          return str.replace(/^([^a-zA-Z]*)([a-zA-Z])/, (match, nonLetters, firstLetter) => {
            return nonLetters + firstLetter.toUpperCase();
          });
        };

        // Add leading space and capitalize the first letter
        setAllTextSentences(allTextSentences => [...allTextSentences, ` ${capitalizeFirstLetter(sentence)}`]);
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

  console.log('reff-allsentences', allTextSentences)
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

  // Fetch post data if not provided as prop
  useEffect(() => {
    console.log('fffs', propPost, window.location.pathname)
    // If we already have the post data from props, no need to fetch
    if (propPost && propPost.selftext) {
      setPost(propPost);
      return;
    }

    // Parse URL directly for more reliability on page refresh
    const pathname = window.location.pathname;

    // Check if URL matches the expected pattern for a Reddit post
    const postPathRegex = /\/r\/([^\/]+)\/comments\/([^\/]+)/;
    const match = pathname.match(postPathRegex);

    if (match) {
      const subredditName = match[1];
      const postId = match[2];

      setLoading(true);
      setError(null);

      // Check if we have a valid cache first
      const cachedPost = getCachedPost(subredditName, postId);
      if (cachedPost) {
        setPost(cachedPost);
        setLoading(false);
        return;
      }

      // Construct the Reddit API URL
      const redditApiUrl = `https://www.reddit.com${pathname}.json`;

      console.log(`Fetching post data from: ${redditApiUrl}`);

      fetch(redditApiUrl)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to fetch post (${response.status})`);
          }
          return response.json();
        })
        .then(data => {
          // Reddit returns an array with [post, comments]
          if (data && data.length > 0 && data[0].data.children.length > 0) {
            // Extract post data
            const fetchedPost = data[0].data.children[0].data;

            // Add comments data if needed
            if (data.length > 1) {
              fetchedPost.comments = data[1].data.children
                .filter(child => child.kind !== 'more')
                .map(child => child.data);
            }

            // Cache the post data
            cachePost(subredditName, postId, fetchedPost);

            setPost(fetchedPost);
            console.log("Post data retrieved successfully");
          } else {
            throw new Error('Post data structure not as expected');
          }
          setLoading(false);
        })
        .catch(err => {
          console.error('Error loading post:', err);
          setError(`Failed to load post: ${err.message}`);
          setLoading(false);
        });
    } else {
      setError('Invalid post URL format');
      setLoading(false);
    }
  }, [propPost]);

  if (loading) {
    return <div className="loading">Loading post...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!post) {
    return <div className="error">Post not found</div>;
  }

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


      <SummaryGenerator selftext_html={post.selftext_html} />


      <div
        className="post-content"
        ref={contentRef}
        dangerouslySetInnerHTML={{ __html:  processedContent }}
      />


<CommentsList post={post} />

      {/* Fixed bottom tab container */}
      <div className="fixed-bottom-tabs">
        <div className="tab-buttons">
          <button 
            className={activeTab === 'controls' ? 'active' : ''}
            onClick={() => setActiveTab('controls')}
          >
            Synth
          </button>
          <button 
            className={activeTab === 'player' ? 'active' : ''}
            onClick={() => setActiveTab('player')}
          >
            Kokoro
          </button>
        </div>
        
        <div className="tab-content">
          {activeTab === 'player' && (
            <div className="tab-pane">
              <KokoroPlayer 
                allTextSentences={allTextSentences} 
                currentIndex={currentIndex} 
                setCurrentIndex={e => {
                  console.log('setCurrentIndex', e)
                  setCurrentIndex(e)
                }}
              />
            </div>
          )}
          
          {activeTab === 'controls' && (
            <div className="tab-pane">
              <SynthControls
                text={post.selftext}
                contentRef={contentRef}
                currentIndex={Math.max(currentIndex, 0)}
                setCurrentIndex={setCurrentIndex}
                totalSentences={totalSentences}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
