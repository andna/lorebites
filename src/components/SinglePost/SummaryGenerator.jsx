import React, { useState, useRef, useEffect } from 'react';
import './SummaryGenerator.css';

  // Function to count words in HTML content
  const countWords = (htmlContent) => {
    if (!htmlContent) return 0;
    // Remove HTML tags and replace <br> with spaces
    const plainText = htmlContent.replace(/<br\s*\/?>/gi, ' ').replace(/<\/?[^>]+(>|$)/g, '');
    // Count words (split by whitespace and filter out empty strings)
    return plainText.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

export function SummaryGenerator({ selftext_html }) {
  const [summaryData, setSummaryData] = useState({
    biteCut: { content: '' },
    shortCut: { content: '' }
  });
  const [wordCounts, setWordCounts] = useState({
    biteCut: 0,
    shortCut: 0
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
      biteCut: { content: '' },
      shortCut: { content: '' }
    });
    setWordCounts({
      biteCut: 0,
      shortCut: 0
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
        // Word counts will be calculated in useEffect
      } else if (data.raw) {
        // Fallback for raw deltas if we receive them
        console.log('Received raw delta:', data.raw);
      } else {
        // Handle structured JSON with biteCut and shortCut
        setSummaryData(data);
        
        // Calculate word counts from the received data
        setWordCounts({
          biteCut: countWords(data.biteCut?.content),
          shortCut: countWords(data.shortCut?.content)
        });
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
              <h3>Bite Cut ({wordCounts.biteCut} words)</h3>
              <div className="summary-text" dangerouslySetInnerHTML={{ __html: summaryData.biteCut.content }}></div>
            </div>
            
            {summaryData.shortCut?.content && (
              <div className="summary-section">
                <h3>Short Cut ({wordCounts.shortCut} words)</h3>
                <div className="summary-text" dangerouslySetInnerHTML={{ __html: summaryData.shortCut.content }}></div>
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
