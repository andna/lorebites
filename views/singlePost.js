import { formatRelativeTime, updateHeaders, getReadingTime, getReadingTimeInSeconds, formatReadingProgress } from '../script.js';
import { loadSubreddit } from './postsList.js';

export function showPost(post) {
    let progressTimer = null;
    let elapsedSeconds = 0;
    let currentIndex = 0;
    const totalSeconds = getReadingTimeInSeconds(post.selftext);
    
    // Function to update progress display
    function updateProgressDisplay() {
        const formattedTime = formatTime(elapsedSeconds);
        $('.reading-progress').text(`${formattedTime} / ${getReadingTime(post.selftext)}`);
    }

    // Function to format time
    function formatTime(seconds) {
        if (seconds < 60) {
            return `0:${seconds.toString().padStart(2, '0')}`;
        } else {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        }
    }

    // Function to speak a sentence
    function speakSentence() {
        const $sentences = $('.sentence');
        if (currentIndex < $sentences.length) {
            const $currentSentence = $sentences.eq(currentIndex);
            
            // Remove previous highlighting
            $('.reading').removeClass('reading');
            // Add highlighting to current sentence
            $currentSentence.addClass('reading');
            
            // Update slider position
            $('.content-slider').val(currentIndex);
            
            const utterance = new SpeechSynthesisUtterance($currentSentence.text());
            
            // Start or continue the progress timer
            if (progressTimer) {
                clearInterval(progressTimer);
            }
            
            progressTimer = setInterval(() => {
                elapsedSeconds++;
                updateProgressDisplay();
                
                // Safety check - don't let timer run forever
                if (elapsedSeconds > totalSeconds + 30) {
                    clearInterval(progressTimer);
                }
            }, 1000);
            
            utterance.onend = () => {
                $currentSentence.removeClass('reading');
                currentIndex++;
                if (currentIndex < $sentences.length) {
                    speakSentence();
                } else {
                    // Reading complete
                    $('.pause-button').hide();
                    $('.play-button').show();
                    clearInterval(progressTimer);
                    progressTimer = null;
                }
            };
            
            window.speechSynthesis.speak(utterance);
        }
    }

    // Function to start reading from a specific index
    function startSpeakingFrom(startIndex) {
        currentIndex = startIndex;
        
        // Update elapsed seconds based on the new position
        elapsedSeconds = Math.floor((currentIndex / $('.sentence').length) * totalSeconds);
        updateProgressDisplay();
        
        // Clear any existing timer
        if (progressTimer) {
            clearInterval(progressTimer);
        }
        
        speakSentence();
        
        $('.play-button').hide();
        $('.pause-button').show();
    }

    // Create the reading progress element
    const $progressDisplay = $('<div>')
        .addClass('reading-progress')
        .text(`0:00 / ${getReadingTime(post.selftext)}`);
    
    updateHeaders({
        mainText: post.title,
        showBack: true,
        onBack: () => {
            // Stop any ongoing speech synthesis
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel(); // Stop the current speech
            }
            
            // Clear any running timers
            if (progressTimer) {
                clearInterval(progressTimer);
                progressTimer = null;
            }
            
            loadSubreddit({ sub: post.subreddit }, 'top', 'day'); // Adjust sort and timeRange as needed
        }
    });
    
    const $content = $('#content');
    
    // Process the HTML content first
    const decodedHtml = decodeHtml(post.selftext_html.replace(/<!--.*?-->/g, ''));
    const $tempDiv = $('<div>').html(decodedHtml);
    

    let totalSentences = 0;

    // Process each paragraph and wrap sentences while preserving HTML
    $tempDiv.find('p').each(function() {
        const $p = $(this);
        
        // First, let's collect all text content while preserving HTML structure
        let fullText = '';
        let htmlMap = [];  // Store HTML elements and their positions
        
        function collectText(node, inHtml = false) {
            if (node.nodeType === 3) { // Text node
                if (inHtml) {
                    // If we're inside an HTML tag, just collect the text
                    fullText += node.textContent;
                } else {
                    // If we're not in an HTML tag, add spaces if needed
                    const text = node.textContent;
                    if (fullText && !fullText.endsWith(' ') && !text.startsWith(' ')) {
                        fullText += ' ';
                    }
                    fullText += text;
                }
            } else if (node.nodeType === 1) { // Element node
                const tag = node.tagName.toLowerCase();
                const startPos = fullText.length;
                
                // Recursively collect text inside this tag
                Array.from(node.childNodes).forEach(child => collectText(child, true));
                
                // Store HTML element information
                htmlMap.push({
                    tag,
                    startPos,
                    endPos: fullText.length,
                    attributes: Array.from(node.attributes)
                });
            }
        }
        
        // Collect all text and HTML positions
        Array.from($p[0].childNodes).forEach(node => collectText(node));
        
        // Now split into sentences
        let processedHtml = '';
        let lastEnd = 0;
        const sentences = fullText.match(/[^.!?]+[.!?]+/g) || [fullText];
        totalSentences += sentences.length;

        
        sentences.forEach((sentence, index) => {
            if (!sentence.trim()) return;
            
            let sentenceHtml = sentence;
            const startPos = fullText.indexOf(sentence, lastEnd);
            const endPos = startPos + sentence.length;
            
            // Insert HTML tags at their correct positions
            htmlMap.forEach(({tag, startPos: tagStart, endPos: tagEnd, attributes}) => {
                if (tagStart >= startPos && tagEnd <= endPos) {
                    // HTML element is entirely within this sentence
                    const relativeStart = tagStart - startPos;
                    const relativeEnd = tagEnd - startPos;
                    const before = sentenceHtml.slice(0, relativeStart);
                    const content = sentenceHtml.slice(relativeStart, relativeEnd);
                    const after = sentenceHtml.slice(relativeEnd);
                    
                    let attrs = '';
                    attributes.forEach(attr => {
                        attrs += ` ${attr.name}="${attr.value}"`;
                    });
                    
                    sentenceHtml = `${before}<${tag}${attrs}>${content}</${tag}>${after}`;
                }
            });
            
            // Add both paragraph and sentence indices
            processedHtml += `<span class="sentence" data-paragraph="${$p.index()}" data-sentence="${index}">${sentenceHtml}</span>`;
            lastEnd = endPos;
        });
        
        $p.html(processedHtml);
    });

    // Add target="_blank" to links after processing sentences
    const processedHtml = addTargetBlank($tempDiv.html());
    
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
                    $('<div>').addClass('post-content').html(processedHtml)
                )
                .append($('<div>').addClass('post-controls')
                    .append($progressDisplay)
                    .append($('<button>').addClass('play-button').text("Play").on('click', () => {
                        const $sentences = $('.sentence');
                        if ($sentences.length) {
                            if (window.speechSynthesis.paused) {
                                window.speechSynthesis.resume();
                                // Restart the timer
                                progressTimer = setInterval(() => {
                                    elapsedSeconds++;
                                    updateProgressDisplay();
                                }, 1000);
                            } else {
                                // Starting fresh
                                startSpeakingFrom(0);
                            }
                        }
                    }))
                    .append($('<button>').addClass('pause-button').text("Pause").hide().on('click', () => {
                        window.speechSynthesis.pause();
                        $('.pause-button').hide();
                        $('.play-button').show();
                        
                        // Pause the timer
                        if (progressTimer) {
                            clearInterval(progressTimer);
                            progressTimer = null;
                        }
                    }))
                    .append($('<input type="range">')
                        .addClass('content-slider')
                        .attr({
                            min: 0,
                            max: totalSentences - 1,
                            value: currentIndex
                        })
                        .on('input', function() {
                            const newIndex = parseInt($(this).val());
                            // Update progress time immediately when sliding
                            elapsedSeconds = Math.floor((newIndex / $('.sentence').length) * totalSeconds);
                            updateProgressDisplay();
                        })
                        .on('change', function() {
                            const newIndex = parseInt($(this).val());
                            if (window.speechSynthesis.speaking) {
                                window.speechSynthesis.cancel();
                            }
                            if (progressTimer) {
                                clearInterval(progressTimer);
                            }
                            startSpeakingFrom(newIndex);
                        })
                    )
                )
            );

    // Set up the slider after content is added to DOM
    const $sentences = $('.sentence');
    const $slider = $('.content-slider');
    
    // Function to get total sentence count and map indices
    const getSentenceInfo = () => {
        let totalCount = 0;
        const indexMap = new Map();
        
        $('.sentence').each(function() {
            const $sentence = $(this);
            const paragraphIndex = parseInt($sentence.data('paragraph'));
            const sentenceIndex = parseInt($sentence.data('sentence'));
            
            indexMap.set(totalCount, {
                paragraphIndex,
                sentenceIndex,
                element: $sentence
            });
            
            totalCount++;
        });
        
        return { totalCount, indexMap };
    };

    // Get sentence information
    const { totalCount, indexMap } = getSentenceInfo();
    
    // When setting up the sentences, add click handlers
    $sentences.each((idx, sentence) => {
        $(sentence).on('click', () => {
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
            }
            if (progressTimer) {
                clearInterval(progressTimer);
            }
            startSpeakingFrom(idx);
        });
    });
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