// summaryUtils.js - Utilities for summary generation and streaming

/**
 * Count words in HTML content
 * @param {string} htmlContent HTML content to count words in
 * @returns {number} Word count
 */
export const countWords = (htmlContent) => {
  if (!htmlContent) return 0;
  // Remove HTML tags and replace <br> with spaces
  const plainText = htmlContent.replace(/<br\s*\/?>/gi, ' ').replace(/<\/?[^>]+(>|$)/g, '');
  // Count words (split by whitespace and filter out empty strings)
  return plainText.trim().split(/\s+/).filter(word => word.length > 0).length;
};

/**
 * Generate a summary using the backend streaming API
 * @param {Object} options Options for summary generation
 * @param {string} options.text Text to summarize
 * @param {Function} options.onStart Callback when summary generation starts
 * @param {Function} options.onData Callback when data is received
 * @param {Function} options.onError Callback when an error occurs
 * @param {Function} options.onComplete Callback when summary generation completes
 * @param {string} options.apiEndpoint API endpoint for summary generation
 */
export const generateSummary = ({
  text,
  onStart = () => {},
  onData = () => {},
  onError = () => {},
  onComplete = () => {},
  apiEndpoint = 'http://localhost:3002/api/stream',
  useStreamSummary = true
}) => {
  if (!text) {
    onError('No content to summarize');
    return;
  }

  // Initialize state
  onStart();
  
  // Track if we've received any data
  let dataReceived = false;
  
  // Create EventSource for streaming
  const encodedText = encodeURIComponent(text);
  const eventSource = new EventSource(`${apiEndpoint}?text=${encodedText}`);

  // Handle incoming messages
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    dataReceived = true;
    
    if (data.error) {
      onError(data.error);
      eventSource.close();
    } else if (data.done) {
      console.log('Stream completed successfully');
      onComplete();
    } else if (data.raw) {
      console.log('Received raw delta:', data.raw);
    } else {
      // Handle structured JSON with biteCut and shortCut
      onData(data);
    }
  };

  // Handle errors
  eventSource.onerror = (err) => {
    if (!dataReceived) {
      if (eventSource.readyState === EventSource.CLOSED) {
        onError('Failed to receive any data');
      } else {
        onError('Connection error - please try again');
      }
    }
    
    onComplete();
    eventSource.close();
  };

  // Handle connection open
  eventSource.onopen = () => {
    console.log('Summary stream connection opened');
  };

  // Return a cleanup function
  return () => {
    eventSource.close();
  };
};
