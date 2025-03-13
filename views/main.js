import { loadSubreddit } from './postsList.js';
import { updateHeaders } from '../script.js';

// Main view handling the subreddit grid
export const subreddits = [
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

export function renderSubredditButtons() {
    updateHeaders({
        mainText: 'Reddit Story Reader',
        showBack: false,
        actionEnabled: false
    });

    const $grid = $('<div>').addClass('subreddit-grid');
    
    subreddits.forEach(sub => {
        $('<div>').addClass('card')
            .append(
                $('<div>').addClass('subreddit-header')
                    .append($('<h2>').html(`<small>r/</small>${sub.sub}`))
                    .append($('<div>').addClass('sub-subtitle').html(`<span>${sub.emoji}</span><small>${sub.subs}M</small>`))
            )
            .append($('<p>').addClass('subreddit-desc').text(sub.desc))
            .on('click', () => loadSubreddit(sub))
            .appendTo($grid);
    });

    $('#content').empty().append($grid);
} 