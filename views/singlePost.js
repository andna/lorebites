import { formatRelativeTime, updateHeaders } from '../script.js';
import { loadSubreddit } from './postsList.js';

export function showPost(post) {
    updateHeaders({
        mainText: post.title,
        showBack: true,
        onBack: () => {
            // Stop any ongoing speech synthesis
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel(); // Stop the current speech
            }
            loadSubreddit({ sub: post.subreddit }, 'top', 'day'); // Adjust sort and timeRange as needed
        }
    });
    
    const $content = $('#content');
    
    $content.empty()
        .append(
            $('<div>').addClass('post-view')
                .append(
                    $('<div>').addClass('action-header')
                    .append($('<div>')
                        .append($('<span>').text(`${formatRelativeTime(post.created_utc)} by `))
                        .append($('<i>').text(`u/${post.author}`))
                        .append($('<br>'))
                        .append($('<span>').text(`in r/${post.subreddit}`))
                    )
                    .append($('<div>')
                        
                        .append($('<div>').text(`⤊ ${post.score}`))
                        .append($('<div>').text(`☁ ${post.num_comments}`))
                    )
                )
                .append(
                    $('<div>').addClass('post-content').html(addTargetBlank(decodeHtml(post.selftext_html.replace(/<!--.*?-->/g, '')))) // Decode HTML entities, remove comments, and add target="_blank"
                )
                .append($('<div>').addClass('post-controls')
              
                    .append($('<button>').addClass('play-button').text("Play").on('click', () => {
                        const postText = post.selftext;
                        console.log(postText);
                        if (postText.trim()) { // Check if there is text to read
                            if (window.speechSynthesis.paused) {
                                window.speechSynthesis.resume(); // Resume if paused
                            } else {
                                const utterance = new SpeechSynthesisUtterance(postText);
                                window.speechSynthesis.speak(utterance);
                            
                                // Handle the end of speech
                                utterance.onend = () => {
                                    $('.pause-button').hide(); // Hide pause button when done
                                    $('.play-button').show(); // Show play button when done
                                };
                            }
                            $('.play-button').hide(); // Hide the play button
                            $('.pause-button').show(); // Show the pause button
                        } else {
                            console.warn('No text available to read.');
                        }
                    }))
                    .append($('<button>').addClass('pause-button').text("Pause").hide().on('click', () => {
                        window.speechSynthesis.pause(); // Pause the speech
                        $('.pause-button').hide(); // Hide the pause button
                        $('.play-button').show(); // Show the play button
                    }))
            )
        );
}

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

function decodeHtml(html) {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
}

function addTargetBlank(html) {
    return html.replace(/<a\s+(?![^>]*target=)([^>]*?)>/g, '<a target="_blank" $1>');
}