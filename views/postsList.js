import { renderSubredditButtons } from './main.js';
import { showPost } from './singlePost.js';
import { formatRelativeTime, updateHeaders } from '../script.js';

function getStorageKey(subreddit, sort, timeRange) {
    return `reddit_posts_${subreddit}_${sort}_${timeRange}`.toLowerCase();
}

function getCachedPosts(subreddit, sort, timeRange) {
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
}

function cachePosts(subreddit, sort, timeRange, posts) {
    const key = getStorageKey(subreddit, sort, timeRange);
    const data = {
        posts,
        timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(data));
}

function renderPosts($postsList, posts) {
    $postsList.empty();
    
    posts.forEach(post => {
        $('<div>').addClass('card')
            .append(
                $('<div>')
                    .append($('<h2>').addClass('post-title').text(post.title))
                    .append($('<small>').text(post.selftext?.slice(0, 200) + '...'))
            )
            .append(
                $('<div>').addClass('post-meta')
                    .append($('<div>').text(formatRelativeTime(post.created_utc)))
                    .append($('<div>').text(`⤊ ${post.score}`))
                    .append($('<div>').text(`☁ ${post.num_comments}`))
            )
            .on('click', () => showPost(post))
            .appendTo($postsList);
    });
}

export function loadSubreddit(subredditData, sort = 'top', timeRange = 'day') {
    const subreddit = subredditData.sub;
    updateHeaders({
        mainText: `r/${subredditData.sub}`,
        showBack: true,
        onBack: renderSubredditButtons
    });

    const $content = $('#content');
    
    // Create header with controls
    const $header = $('<div>').addClass('action-header')
        .append(
            $('<div>').addClass('sort-controls')
            .append('Sorting Top')
            .append(
                $('<select>').attr('id', 'timeRangeSelect')
                    .append('<option value="hour">Past Hour</option>')
                    .append('<option value="day" selected>Past 24 Hours</option>')
                    .append('<option value="week">Past Week</option>')
                    .append('<option value="month">Past Month</option>')
                    .append('<option value="year">Past Year</option>')
                    .append('<option value="all">All Time</option>')
                    .val(timeRange)
                    .on('change', () => handleSortChange(subredditData))
            )
        )
        .append($('<button>').text("Random"))
        

    const $postsList = $('<div>').addClass('posts-list')
        .append($('<div>').addClass('loading').text('Loading posts...'));

    $content.empty().append($header).append($postsList);

    // Check cache first
    const cachedPosts = getCachedPosts(subreddit, sort, timeRange);
    if (cachedPosts) {
        console.log('Using cached posts');
        renderPosts($postsList, cachedPosts);
        return;
    }

    // Fetch from API if not cached or expired
    $.get(`/posts/${subreddit}?sort=${sort}&t=${timeRange}`)
        .done(posts => {
            cachePosts(subreddit, sort, timeRange, posts);
            renderPosts($postsList, posts);
        })
        .fail(error => {
            $postsList.html(
                $('<div>').addClass('error').text('Failed to load posts. Please try again.')
            );
            console.error('Error loading posts:', error);
        });
}

export function handleSortChange(subredditData) {
    const timeRange = $('#timeRangeSelect').val();
    loadSubreddit(subredditData, 'top', timeRange);
} 