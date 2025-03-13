import { formatRelativeTime, updateHeaders } from '../script.js';
import { loadSubreddit } from './postsList.js';

export function showPost(post) {
    updateHeaders({
        mainText: `${post.title}`,
        subText: `By u/${post.author} in r/${post.subreddit}`,
        showBack: true,
        actionEnabled: true,
        actionText: 'Share',
        onBack: () => loadSubreddit(post.subreddit),
        onAction: () => {
            // Share functionality to be added
            console.log('Share clicked');
        }
    });
    
    const $content = $('#content');
    
    // Decode HTML entities from selftext_html
    const decodedHtml = $('<div>').html(post.selftext_html).text();
    
    $content.empty()
        .append(
            $('<div>').addClass('post-view')
                .append(
                    $('<div>').addClass('post-meta')
                        .append($('<span>').text(formatRelativeTime(post.created_utc)))
                        .append($('<span>').text(`⤊ ${post.score}`))
                        .append($('<span>').text(`☁ ${post.num_comments}`))
                )
                .append(
                    $('<div>').addClass('post-content').html(decodedHtml)
                )
        );
}

export function closeModal() {
    // When closing the modal, we need to restore the previous header
    // This assumes we're going back to the subreddit view
    const subreddit = $('.subreddit-header h1').text().replace('r/', '');
    updateHeaders(
        `r/${subreddit}`,
        'Browse top stories from this community'
    );
    
    $('#postModal').fadeOut();
}

// Set up modal close handlers
$(document).ready(() => {
    $('.close-button').on('click', closeModal);

    $(window).on('click', event => {
        const $modal = $('#postModal');
        if (event.target === $modal[0]) {
            closeModal();
        }
    });
});

async function summarizeWithClaude(text) {
    try {
        if (!text || text.trim().length === 0) {
            console.warn('Empty text provided to summarize');
            return 'No content to summarize';
        }

        // Log the input text (first 100 characters)
        console.log('Sending text to summarize:', text.substring(0, 100) + '...');
        const requestBody = JSON.stringify({ text });
        console.log('Request body:', requestBody);

        const response = await fetch('http://localhost:3000/summarize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: requestBody
        });

        const responseData = await response.text();
        console.log('Raw server response:', responseData);

        if (!response.ok) {
            throw new Error(`Server error: ${response.status} - ${responseData}`);
        }

        try {
            const data = JSON.parse(responseData);
            if (!data.summary) {
                console.warn('No summary in response data:', data);
                return 'No summary generated';
            }
            return data.summary;
        } catch (parseError) {
            console.error('Failed to parse response:', parseError);
            return 'Failed to parse server response';
        }
    } catch (error) {
        console.error('Error getting summary:', error);
        return `Failed to generate summary: ${error.message}`;
    }
}