import React, { useState, useEffect, useRef } from 'react';
import './CommentsList.css';

export function CommentsList({ post }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchedPostIds = useRef(new Set());

  // Function to get storage key for caching
  const getStorageKey = (postId) => {
    return `reddit_comments_${postId}`.toLowerCase();
  };

  // Function to get cached comments
  const getCachedComments = (postId) => {
    const key = getStorageKey(postId);
    const cached = localStorage.getItem(key);

    if (!cached) return null;

    try {
      const { comments, timestamp } = JSON.parse(cached);
      const isExpired = Date.now() - timestamp > (60000 * 30); // 30 minutes in milliseconds

      if (isExpired) {
        console.log(`Cached comments for post ${postId} expired, removing from cache`);
        localStorage.removeItem(key);
        return null;
      }

      console.log(`Using cached comments for post ${postId}, cache age: ${Math.round((Date.now() - timestamp) / 60000)} minutes`);
      return comments;
    } catch (err) {
      console.error('Error parsing cached comments:', err);
      localStorage.removeItem(key);
      return null;
    }
  };

  // Function to cache comments
  const cacheComments = (postId, comments) => {
    if (!postId) return;
    
    const key = getStorageKey(postId);
    const data = {
      comments,
      timestamp: Date.now()
    };
    
    try {
      localStorage.setItem(key, JSON.stringify(data));
      console.log(`Comments for post ${postId} cached successfully`);
    } catch (err) {
      console.error('Error caching comments:', err);
      // In case of quota exceeded or other errors, try to clear old caches
      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key.startsWith('reddit_comments_')) {
            keysToRemove.push(key);
          }
        }
        
        // Remove oldest caches first (keep newest 10)
        if (keysToRemove.length > 10) {
          const itemsToRemove = keysToRemove.slice(0, keysToRemove.length - 10);
          itemsToRemove.forEach(key => localStorage.removeItem(key));
          console.log(`Removed ${itemsToRemove.length} old comment caches`);
        }
      } catch (e) {
        console.error('Error cleaning up cache:', e);
      }
    }
  };

  useEffect(() => {
    if (!post) {
      setLoading(false);
      return;
    }

    // If comments are already available from the post object, use them
    if (post.comments) {
      console.log("Using existing comments from post data");
      setComments(post.comments);
      setLoading(false);
      
      // Cache these comments for future visits
      if (post.id) {
        cacheComments(post.id, post.comments);
      }
      return;
    }

    // Only fetch if we don't already have comments and haven't fetched for this post yet
    if (!post.permalink || !post.id) {
      setLoading(false);
      return;
    }

    // Skip if we've already fetched for this post in this session
    if (fetchedPostIds.current.has(post.id)) {
      console.log(`Already fetched comments for post ${post.id} in this session, skipping`);
      return;
    }

    // Check cache first
    const cachedComments = getCachedComments(post.id);
    if (cachedComments) {
      setComments(cachedComments);
      setLoading(false);
      fetchedPostIds.current.add(post.id);
      return;
    }

    // Add this post ID to our set of fetched posts
    fetchedPostIds.current.add(post.id);

    // Format the API URL to get the top comments
    const cleanPermalink = post.permalink.endsWith('/') 
      ? post.permalink.slice(0, -1) 
      : post.permalink;
      
    const commentsUrl = `https://www.reddit.com${cleanPermalink}.json?limit=3&sort=top`;
    
    console.log("Fetching comments from API for post:", post.id);
    
    fetch(commentsUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch comments: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        // Reddit API returns an array with [post, comments]
        if (data && data.length >= 2 && data[1].data.children) {
          // Filter out "more comments" items which have kind "more"
          const commentData = data[1].data.children
            .filter(child => child.kind === 't1')
            .map(child => child.data);
          
          setComments(commentData);
          
          // Cache the comments
          cacheComments(post.id, commentData);
        } else {
          setComments([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching comments:', err);
        setError(`Failed to load comments: ${err.message}`);
        setLoading(false);
      });
  }, [post]);

  // Function to decode HTML entities
  const decodeHtml = (html) => {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  };

  // Function to create markup from HTML
  const createMarkup = (htmlContent) => {
    return { __html: decodeHtml(htmlContent) };
  };

  return (
    <div className="comments-section">
      
      {loading ? (
        <div className="comments-loading">Loading comments...</div>
      ) : error ? (
        <div className="comments-error">{error}</div>
      ) : comments.length === 0 ? (
        <div className="no-comments">No comments available</div>
      ) : (
        <>
          <h2>Top {comments.length > 1 ? comments.length : ''} {comments.length > 1 ? 'Comments' : 'Comment'}</h2>

        <div className="comments-list">
          {comments.map((comment, index) => (
            <div key={comment.id} className="comment-card">
              <div className="comment-header">
                <div className="comment-number">#{index + 1}</div>
                <div className="comment-author">u/{comment.author}</div>
                <div className="comment-score">{comment.score} 👍</div>
              </div>
              
              <div 
                className="comment-body"
                dangerouslySetInnerHTML={createMarkup(comment.body_html)}
              />
            
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  );
} 