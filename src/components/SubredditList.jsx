import React from 'react';
import './SubredditList.css'; // Create this file for styling

export function SubredditList({ onSelectSubreddit }) {
  // Moved the subreddits array from main.js
  const subreddits = [
    {
      "sub": "noSleep",
      "subs": 18,
      "desc": "Original horror stories told as if they were real.",
      "emoji": "📖👻"
    },
    {
      "sub": "TIFU",
      "subs": 18,
      "desc": "Stories about mistakes, often humorous or disastrous.",
      "emoji": "😬🤦"
    },
    {
      "sub": "WritingPrompts",
      "subs": 18,
      "desc": "Short and long stories inspired by prompts.",
      "emoji": "✍️💡"
    },
    {
      "sub": "TrueOffMyChest",
      "subs": 10,
      "desc": "Deep, personal stories and confessions.",
      "emoji": "💬💔"
    },
    {
      "sub": "AmITheAsshole",
      "subs": 10,
      "desc": "People explain conflicts and ask if they were in the wrong.",
      "emoji": "⚖️🤷"
    },
    {
      "sub": "MaliciousCompliance",
      "subs": 4,
      "desc": "Stories of following orders exactly, with amusing or dramatic results.",
      "emoji": "📜😏"
    },
    {
      "sub": "ProRevenge",
      "subs": 2.5,
      "desc": "Satisfying, well-planned revenge stories.",
      "emoji": "🎯😈"
    },
    {
      "sub": "LetsNotMeet",
      "subs": 3,
      "desc": "Creepy real-life encounters and stalker stories.",
      "emoji": "😨👀"
    },
    {
      "sub": "ShortScaryStories",
      "subs": 1,
      "desc": "Concise but chilling horror stories.",
      "emoji": "📖😱"
    },
    {
      "sub": "TalesFromRetail",
      "subs": 1,
      "desc": "Stories from retail workers about weird, funny, or awful customer experiences.",
      "emoji": "🛒😤"
    }
  ];

  // Render the subreddit grid
  return (
    <div className="subreddit-grid">
      {subreddits.map((sub) => (
        <div 
          key={sub.sub} 
          className="card"
          onClick={() => onSelectSubreddit(sub)}
        >
          <div className="subreddit-title">
            <h2>
              <small>r/</small>
              {sub.sub}
            </h2>
            <div className="sub-subtitle">
              <span>{sub.emoji}</span>
              <small>{sub.subs}M</small>
            </div>
          </div>
          <p className="subreddit-desc">{sub.desc}</p>
        </div>
      ))}
    </div>
  );
}
