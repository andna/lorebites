import React from 'react';
import './SubredditList.css'; // Create this file for styling

export function SubredditList({ onSelectSubreddit }) {
  // Moved the subreddits array from main.js
  const subreddits = [
    // {
    //   "sub": "noSleep",
    //   "subs": 18,
    //   "desc": "Original horror told as if they were real.",
    //   "emoji": "📖💀"
    // },
    {
      "sub": "TIFU",
      "subs": 18,
      "desc": "Mistakes, often humorous or disastrous.",
      "emoji": "❌🤦"
    },
    // {
    //   "sub": "WritingPrompts",
    //   "subs": 18,
    //   "desc": "Short and long stories inspired by prompts.",
    //   "emoji": "💡✍️"
    // },
    {
      "sub": "TrueOffMyChest",
      "subs": 10,
      "desc": "Deep, personal stories and confessions.",
      "emoji": "💬🙊"
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
      "desc": "Following orders exactly, with amusing or dramatic results.",
      "emoji": "📌😏"
    },
    //{
    //  "sub": "PettyRevenge",
    //  "subs": 4,
    //  "desc": "Minor but satisfying acts of revenge on everyday wrongs.",
    //  "emoji": "😈💅"
    //},
    // {
    //   "sub": "ProRevenge",
    //   "subs": 2,
    //   "desc": "Satisfying, well-planned revenge.",
    //   "emoji": "🎯😈"
    // },
    {
      "sub": "LetsNotMeet",
      "subs": 3,
      "desc": "Creepy real-life encounters with stalkers.",
      "emoji": "🚷🫥"
    },
    {
      "sub": "ShortScaryStories",
      "subs": 1,
      "desc": "Concise but chilling terror.",
      "emoji": "👻👁"
    },
    //{
    //  "sub": "TalesFromRetail",
    //  "subs": 1,
    //  "desc": "Awful, weird, or funny retail customer experiences.",
    //  "emoji": "🛒😤"
    //}

    {
      "sub": "Classics",
      "subs": 0,
      "desc": "Public domain books.",
      "emoji": "🏛️📚",
      "comingSoon": true
    },
    {
      "sub": "Other threads",
      "subs": 0,
      "desc": "Twitter, Hacker News, Tumblr, Wattpad, AO3, etc.",
      "emoji": "📋🧵",
      "comingSoon": true
    },
  ];

  // Render the subreddit grid
  return (
    <div className="s-grid">
      {subreddits.map((sub) => (
        <div
          key={sub.sub}
          className="card"
          onClick={() => !sub.comingSoon && onSelectSubreddit(sub)}
          style={{
            opacity: sub.comingSoon ? 0.8 : 1
          }}
        >
          <h3 className="s-title">
            {!sub.comingSoon && <small>r/</small>}
            {sub.sub}
          </h3>
          <p className="s-desc">{sub.desc}</p>
          <span className="s-emoji">{sub.emoji}</span>
          <span className="s-members">{sub.comingSoon ? "Soon..." : `~${sub.subs}M`}</span>
        </div>
      ))}
    </div>
  );
}
