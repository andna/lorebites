// summaryUtils.js - Utilities for summary generation and streaming
const { streamSummary } = require('../shared/openaiStreaming');

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
  useServerEventSource = false
}) => {
  if (!text) {
    onError('No content to summarize');
    return;
  }

  // Initialize state
  onStart();
  
  // Use Server-Sent Events (SSE) via EventSource
  if (useServerEventSource) {
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
  } 
  // Use direct OpenAI integration without server
  else {
    // Function to handle the OpenAI API request
    const makeOpenAIRequest = (apiKey) => {
      if (!apiKey) {
        onError('API key is required');
        onComplete();
        return null;
      }
    
      // Create a mock response object to capture the streamed data
      const mockResponse = {
        write: (data) => {
          try {
            // Extract the JSON data from SSE format
            const jsonString = data.replace('data: ', '');
            const parsedData = JSON.parse(jsonString);
            
            if (parsedData.error) {
              const errorMessage = parsedData.error.message || parsedData.error;
              console.error('Error detected:', errorMessage);
              
              // Always reprompt for API key on any error
              const newApiKey = prompt('Error detected. Please enter a valid OpenAI API key:');
              if (newApiKey && newApiKey !== apiKey) {
                console.log('Retrying with new API key');
                makeOpenAIRequest(newApiKey);
                return;
              } else {
                onError('API key is required. Operation canceled.');
                onComplete();
              }
            } else if (parsedData.done) {
              console.log('Stream completed successfully');
              onComplete();
            } else if (parsedData.raw) {
              console.log('Received raw delta:', parsedData.raw);
            } else {
              // Handle structured JSON with biteCut and shortCut
              onData(parsedData);
            }
          } catch (error) {
            console.error('Error parsing streamed data:', error);
            
            // Always reprompt on any error
            const newApiKey = prompt('Error detected. Please enter a valid OpenAI API key:');
            if (newApiKey && newApiKey !== apiKey) {
              makeOpenAIRequest(newApiKey);
            } else {
              onError('API key is required. Operation canceled.');
              onComplete();
            }
          }
        },
        end: () => {
          // Stream has ended
          console.log('Stream ended');
        },
        setHeader: () => {}, // Mock function for compatibility
        status: () => mockResponse, // For chaining
        json: (data) => {
          // Handle error responses formatted as JSON
          if (data && data.error) {
            const errorMessage = data.error.message || data.error;
            console.error('JSON error detected:', errorMessage);
            
            // Always reprompt on any error
            const newApiKey = prompt('Error detected. Please enter a valid OpenAI API key:');
            if (newApiKey && newApiKey !== apiKey) {
              makeOpenAIRequest(newApiKey);
            } else {
              onError('API key is required. Operation canceled.');
              onComplete();
            }
          }
        }
      };
      
      try {
        // Call the streamSummary function directly
        streamSummary({ text, apiKey, dangerouslyAllowBrowser: true }, mockResponse);
      } catch (error) {
        console.error('Error calling streamSummary:', error);
        
        // Always reprompt on any error
        console.error('Stream init error:', error);
        const newApiKey = prompt('Error initializing OpenAI. Please enter a valid API key:');
        if (newApiKey && newApiKey !== apiKey) {
          makeOpenAIRequest(newApiKey);
        } else {
          onError('API key is required. Operation canceled.');
          onComplete();
        }
      }
      
      // Return a no-op cleanup function
      return () => {};
    };
    
    // Prompt for initial API key
    const initialApiKey = prompt('Please enter your OpenAI API key:');
    return makeOpenAIRequest(initialApiKey);
  }
};
