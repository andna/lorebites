import React, { useState, useEffect, useRef } from 'react';
import { formatRelativeTime, getReadingTime } from '../utils/formatters';
import './PostsList.css';

export function PostsList({ subreddit, onSelectPost }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('day');
  const [sort] = useState('top'); // Default sort is 'top'

  // Add a ref to track if we've already fetched for this subreddit+sort+timeRange
  const fetchedRef = useRef({});

  // Function to get storage key for caching
  const getStorageKey = (subreddit, sort, timeRange) => {
    return `reddit_posts_${subreddit.sub}_${sort}_${timeRange}`.toLowerCase();
  };

  // Function to get cached posts
  const getCachedPosts = (subreddit, sort, timeRange) => {
    const key = getStorageKey(subreddit, sort, timeRange);
    const cached = localStorage.getItem(key);

    if (!cached) return null;

    const { posts, timestamp } = JSON.parse(cached);
    const isExpired = Date.now() - timestamp > (60000 * 30); // 30 minutes in milliseconds

    if (isExpired) {
      localStorage.removeItem(key);
      return null;
    }

    return posts;
  };

  // Function to cache posts
  const cachePosts = (subreddit, sort, timeRange, posts) => {
    const key = getStorageKey(subreddit, sort, timeRange);
    const data = {
      posts,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(data));
  };

  // Load posts when subreddit, sort, or timeRange changes
  useEffect(() => {
    if (!subreddit) return;

    // Create a unique key for this fetch request
    const fetchKey = `${subreddit.sub}_${sort}_${timeRange}`;

    // Check if we've already fetched this combination in this component lifecycle
    if (fetchedRef.current[fetchKey]) {
      console.log('Already fetched this combination, skipping');
      return;
    }

    // Mark this combination as fetched
    fetchedRef.current[fetchKey] = true;

    setLoading(true);
    setError(null);

    // Check cache first
    const cachedPosts = getCachedPosts(subreddit, sort, timeRange);
    if (cachedPosts) {
      console.log('Using cached posts');
      setPosts(cachedPosts);
      setLoading(false);
      return;
    }

    console.log(`Fetching from Reddit: r/${subreddit.sub}/${sort}.json?t=${timeRange}`);

    // Fetch from Reddit API
    fetch(`https://www.reddit.com/r/${subreddit.sub}/${sort}.json?limit=10&t=${timeRange}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch posts');
        }
        return response.json();
      })
      .then(data => {

        console.log('refffff', data)
        // Reddit returns data in a nested structure
        const posts = data.data.children.map(child => child.data);
        cachePosts(subreddit, sort, timeRange, posts);
        setPosts(posts);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading posts:', err);
        setError('Failed to load posts. Please try again.');
        setLoading(false);
      });

  }, [subreddit, sort, timeRange]); // Only re-run when these values change

  // Handle time range change
  const handleTimeRangeChange = (e) => {
    setTimeRange(e.target.value);
  };

  // Handle random post selection
  const handleRandomPost = () => {
    if (posts.length > 0) {
      const randomIndex = Math.floor(Math.random() * posts.length);
      onSelectPost(posts[randomIndex]);
    }
  };

  return (
    <div className="posts-container">
      <div className="action-header">
        <i><small>Approx. {subreddit.subs}M<br />suscribers.</small></i>
        <div className="sort-controls">
          Sorting Top
          <select
            id="timeRangeSelect"
            value={timeRange}
            onChange={handleTimeRangeChange}
          >
            <option value="hour">Past Hour</option>
            <option value="day">Past 24 Hours</option>
            <option value="week">Past Week</option>
            <option value="month">Past Month</option>
            <option value="year">Past Year</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      <div className="posts-list">
        {loading ? (
          <div className="loading">Loading posts...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          posts.map(post => (
            <div
              key={post.id}
              className="card"
              onClick={() => onSelectPost(post)}
            >
              <div>
                <h2 className="post-title">{post.title}</h2>
                <small>{post.selftext?.slice(0, 200)}...</small>
              </div>
              <div className="post-meta">
                <div>{formatRelativeTime(post.created_utc)}</div>
                <div>⤊ {post.score}</div>
                <div>☁ {post.num_comments}</div>
                <div>🎧 {getReadingTime(post.selftext)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
