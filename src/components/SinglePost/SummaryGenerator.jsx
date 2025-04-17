import React, { useState, useRef } from 'react';
import './SummaryGenerator.css';

export function SummaryGenerator({ selftext_html }) {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dataReceivedRef = useRef(false);

  const generateSummary = () => {
    if (!selftext_html) {
      setError('No content to summarize');
      return;
    }

    setLoading(true);
    setError(null);
    setSummary('');
    dataReceivedRef.current = false;

    const encodedText = encodeURIComponent(selftext_html);
    const eventSource = new EventSource(`http://localhost:3002/api/stream?text=${encodedText}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.error) {
        setError(data.error);
        eventSource.close();
      } else if (data.content) {
        dataReceivedRef.current = true;
        
        // Special handling for completion marker
        if (data.content === "\n[DONE]") {
          console.log('Stream completed successfully');
        } else {
          // Incrementally update with each token/delta
          setSummary((prevSummary) => prevSummary + data.content);
        }
      }
    };

    eventSource.onerror = (err) => {
      // Only log as error if we didn't receive data (otherwise it's expected behavior)
      if (!dataReceivedRef.current) {
        // This is a real error - no data received
        console.log('EventSource connection ended without receiving data');
        
        // Only show error if absolutely no data was received
        if (eventSource.readyState === EventSource.CLOSED) {
          setError('Failed to receive any data');
        } else {
          setError('Connection error - please try again');
        }
      } else {
        // Normal completion - we got data and the stream ended
        // No need to log anything here
      }
      
      setLoading(false);
      eventSource.close();
    };

    eventSource.onopen = () => {
      setLoading(false);
    };
  };

  return (
    <div className="summary-generator">
      <h3>Post Summary</h3>
      <div className="summary-content">
        {!summary && !loading && !error && (
          <button
            className="generate-button"
            onClick={generateSummary}
            disabled={loading}
          >
            Generate AI Summary
          </button>
        )}

        {loading && <div className="loading">Generating summary...</div>}

        {error && <div className="error">{error}</div>}

        {summary && (
          <div className="summary-text">
            <div dangerouslySetInnerHTML={{ __html: summary }} />
            <button
              className="regenerate-button"
              onClick={generateSummary}
              disabled={loading}
            >
              Regenerate
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
