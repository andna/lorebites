import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, useNavigate, Navigate } from 'react-router-dom';
import { SubredditList } from './SubredditList';
import { PostsList } from './PostsList';
import { SinglePost } from './SinglePost';
import { Menu } from './Menu';
import { DevTester } from './DevTester';
import './MainView.css';

// The main router component
export function MainView() {
  const [darkMode, setDarkMode] = useState(false);
  
  // Check if we're in development mode
  const isDev = true//process.env.NODE_ENV === 'development';
  
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainContent darkMode={darkMode} setDarkMode={setDarkMode} />} />
        <Route path="/r/:subredditName" element={<MainContent darkMode={darkMode} setDarkMode={setDarkMode} />} />
        <Route path="/r/:subredditName/comments/:postId/:commentId" element={<MainContent darkMode={darkMode} setDarkMode={setDarkMode} />} />
        
        {/* Dev-only route */}
        {isDev && (
          <Route path="/dev" element={<DevTester />} />
        )}
      </Routes>
    </Router>
  );
}

// The actual content component
function MainContent({ darkMode, setDarkMode }) {
  const navigate = useNavigate();
  const params = useParams();
  const { subredditName, postId } = params;
  
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentSubreddit, setCurrentSubreddit] = useState(null);
  const [currentPost, setCurrentPost] = useState(null);
  
  // Determine current view based on URL params
  const view = postId ? 'post' : subredditName ? 'posts' : 'subreddits';
  
  // Update state when URL params change
  useEffect(() => {
    if (subredditName && !currentSubreddit) {
      // Set currentSubreddit based on URL param
      setCurrentSubreddit({ sub: subredditName });
    }
    
    if (postId && subredditName && !currentPost) {
      // In a real app, you might fetch the post data here based on postId
      setCurrentPost({ id: postId, title: `Post ${postId}` });
    }
  }, [subredditName, postId, currentSubreddit, currentPost]);
  
  const isSubredditsView = view === 'subreddits';
  const isPostsListView = view === 'posts';
  const isSinglePostsView = view === 'post';
  
  const handleBackButton = () => {
    if (isSinglePostsView) {
      navigate(`/r/${subredditName}`);
    } else if (isPostsListView) {
      navigate('/');
    }
  };
  
  return (
    <div className={`app-container ${isPostsListView ? "is-posts-list" : ""}`}>
      <header id="mainHeader" className="card">
        {!isSubredditsView ? (
          <button className="back-button" onClick={handleBackButton}>
            &lt;
          </button>
        ) : (
          <div className="logo">Logo</div>
        )}

        <div className="title">
          {isSubredditsView 
            ? 'Pick a genre' 
            : isPostsListView 
              ? currentSubreddit?.sub 
              : currentPost?.title || ''}
        </div>
        <button className="menu-button" onClick={() => setMenuOpen(true)}>☰</button>
      </header>
      
      <Menu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
      
      <main>
        {isSubredditsView && (
          <SubredditList 
            onSelectSubreddit={(sub) => {
              setCurrentSubreddit(sub);
              navigate(`/r/${sub.sub.toLowerCase()}`);
            }} 
          />
        )}

        {isPostsListView && currentSubreddit && (
          <PostsList
            subreddit={currentSubreddit}
            onSelectPost={(post) => {
              console.log('refffp', post)
              setCurrentPost(post);
              navigate(`comments/${post.url.split("/comments/")?.[1]}`);
            }}
          />
        )}

        {isSinglePostsView && currentPost && (
          <SinglePost post={currentPost} />
        )}
      </main>
    </div>
  );
}
