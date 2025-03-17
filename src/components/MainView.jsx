import React, { useState } from 'react';
import { SubredditList } from './SubredditList';
import { PostsList } from './PostsList';
import { SinglePost } from './SinglePost';
import { Menu } from './Menu';
import './MainView.css';

export function MainView() {
  const [view, setView] = useState('subreddits'); // 'subreddits', 'posts', 'post'
  const [currentSubreddit, setCurrentSubreddit] = useState(null);
  const [currentPost, setCurrentPost] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const isSubredditsView = view === 'subreddits';
  const isPostsListView = view === 'posts';
  const isSinglePostsView = view === 'post';

  return (
    <div className={`app-container ${isPostsListView ? "is-posts-list" : ""}`}>
      <header id="mainHeader" className="card">
        {!isSubredditsView ? <button className="back-button"
                                 onClick={() => {
                                   if (isSinglePostsView) setView('posts');
                                   else setView('subreddits');
                                 }}>
          &lt;
        </button> : <div className="logo">
          Logo
        </div>}

        <div className="title">
          {isSubredditsView ? 'Pick a genre' :
           isPostsListView ? currentSubreddit?.sub :
           currentPost?.title || ''}
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
          <SubredditList onSelectSubreddit={(sub) => {
            setCurrentSubreddit(sub);
            setView('posts');
          }} />
        )}

        {isPostsListView && currentSubreddit && (
          <PostsList
            subreddit={currentSubreddit}
            onSelectPost={(post) => {
              setCurrentPost(post);
              setView('post');
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
