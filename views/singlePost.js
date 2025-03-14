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
    
    // Process the HTML content first
    const decodedHtml = decodeHtml(post.selftext_html.replace(/<!--.*?-->/g, ''));
    const $tempDiv = $('<div>').html(decodedHtml);
    
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
              
                    .append($('<button>').addClass('play-button').text("Play").on('click', () => {
                        const $sentences = $('.sentence');
                        if ($sentences.length) {
                            let currentIndex = 0;
                            
                            const speakSentence = () => {
                                if (currentIndex < $sentences.length) {
                                    const $currentSentence = $sentences.eq(currentIndex);
                                    
                                    // Remove previous highlighting
                                    $('.reading').removeClass('reading');
                                    // Add highlighting to current sentence
                                    $currentSentence.addClass('reading');
                                    
                                    // Update slider position
                                    $('.content-slider').val(currentIndex);

                                    const utterance = new SpeechSynthesisUtterance($currentSentence.text());
                                    
                                    utterance.onend = () => {
                                        $currentSentence.removeClass('reading');
                                        currentIndex++;
                                        if (currentIndex < $sentences.length) {
                                            speakSentence();
                                        } else {
                                            $('.pause-button').hide();
                                            $('.play-button').show();
                                        }
                                    };
                                    
                                    window.speechSynthesis.speak(utterance);
                                }
                            };

                            if (window.speechSynthesis.paused) {
                                window.speechSynthesis.resume();
                            } else {
                                speakSentence();
                            }
                            
                            $('.play-button').hide();
                            $('.pause-button').show();
                        } else {
                            console.warn('No sentences found to read.');
                        }
                    }))
                    .append($('<button>').addClass('pause-button').text("Pause").hide().on('click', () => {
                        window.speechSynthesis.pause();
                        $('.pause-button').hide();
                        $('.play-button').show();
                    }))
                    .append($('<input type="range">')
                        .addClass('content-slider')
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
    
    // Function to start speaking from a specific index
    const startSpeakingFrom = (globalIndex) => {
        let currentIndex = globalIndex;
        
        const speakSentence = () => {
            if (currentIndex < totalCount) {
                const sentenceInfo = indexMap.get(currentIndex);
                const $currentSentence = sentenceInfo.element;
                
                // Remove previous highlighting
                $('.reading').removeClass('reading');
                // Add highlighting to current sentence
                $currentSentence.addClass('reading');
                
                // Update slider position
                $('.content-slider').val(currentIndex);
                
                // Scroll sentence into view
                $currentSentence[0].scrollIntoView({ behavior: 'smooth', block: 'center' });

                const utterance = new SpeechSynthesisUtterance($currentSentence.text());
                
                utterance.onend = () => {
                    $currentSentence.removeClass('reading');
                    currentIndex++;
                    if (currentIndex < totalCount) {
                        speakSentence();
                    } else {
                        $('.pause-button').hide();
                        $('.play-button').show();
                    }
                };
                
                window.speechSynthesis.speak(utterance);
            }
        };

        // Stop any ongoing speech
        window.speechSynthesis.cancel();
        
        // Start speaking
        speakSentence();
        $('.play-button').hide();
        $('.pause-button').show();
    };
    
    // Only set up controls if we have sentences
    if (totalCount > 0) {
        // Set up slider
        $slider.attr({
            min: 0,
            max: totalCount - 1,
            value: 0,
            step: 1
        });
        
        // Add click handler to sentences
        $sentences.on('click', function() {
            const $clicked = $(this);
            let globalIndex = 0;
            
            // Find the global index of the clicked sentence
            $('.sentence').each(function(idx) {
                if (this === $clicked[0]) {
                    globalIndex = idx;
                    return false; // break the loop
                }
            });
            
            startSpeakingFrom(globalIndex);
        });
        
        $slider.on('input', function() {
            // Stop any ongoing speech
            window.speechSynthesis.cancel();
            $('.pause-button').hide();
            $('.play-button').show();
            
            // Remove previous highlighting
            $('.reading').removeClass('reading');
            
            // Highlight current sentence
            const currentIndex = parseInt($(this).val());
            const sentenceInfo = indexMap.get(currentIndex);
            sentenceInfo.element.addClass('reading');
            
            // Scroll sentence into view
            sentenceInfo.element[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        
        $slider.on('change', function() {
            const startIndex = parseInt($(this).val());
            startSpeakingFrom(startIndex);
        });
    } else {
        // If no sentences, disable the slider
        $slider.attr('disabled', true);
    }
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