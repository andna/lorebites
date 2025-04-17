import React, { useState, useRef } from 'react';
import './SummaryGenerator.css';

export function SummaryGenerator({ selftext_html }) {
  const [summaryData, setSummaryData] = useState({
    biteCut: { content: '', wordCount: 0 },
    shortCut: { content: '', wordCount: 0 }
  });
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
    setSummaryData({
      biteCut: { content: '', wordCount: 0 },
      shortCut: { content: '', wordCount: 0 }
    });
    dataReceivedRef.current = false;

    const encodedText = encodeURIComponent(selftext_html);
    const eventSource = new EventSource(`http://localhost:3002/api/stream?text=${encodedText}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      dataReceivedRef.current = true;
      
      if (data.error) {
        setError(data.error);
        eventSource.close();
      } else if (data.done) {
        console.log('Stream completed successfully');
      } else if (data.raw) {
        // Fallback for raw deltas if we receive them
        console.log('Received raw delta:', data.raw);
      } else {
        // Handle structured JSON with tightCut and microCut
        setSummaryData(data);
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
      <h3>Shortened Versions</h3>
      <div className="summary-content">
        {!summaryData.biteCut?.content && !loading && !error && (
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
        
        {summaryData.biteCut?.content && (
          <div className="summary-container">
            <div className="summary-section">
              <h3>Bite Cut ({summaryData.biteCut.wordCount} words)</h3>
              <div className="summary-text">
                {summaryData.biteCut.content}
              </div>
            </div>
            
            {summaryData.shortCut?.content && (
              <div className="summary-section">
                <h3>Short Cut ({summaryData.shortCut.wordCount} words)</h3>
                <div className="summary-text">
                  {summaryData.shortCut.content}
                </div>
              </div>
            )}
            <div className="button-container">
              <button
                className="regenerate-button"
                onClick={generateSummary}
                disabled={loading}
              >
                Regenerate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
