import React, { useState, useEffect, useRef } from 'react';
import './CommentsList.css';

export function CommentsList({ post }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchedPostIds = useRef(new Set());

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
      return;
    }

    // Only fetch if we don't already have comments and haven't fetched for this post yet
    if (!post.permalink || !post.id) {
      setLoading(false);
      return;
    }

    // Skip if we've already fetched for this post
    if (fetchedPostIds.current.has(post.id)) {
      console.log(`Already fetched comments for post ${post.id}, skipping`);
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