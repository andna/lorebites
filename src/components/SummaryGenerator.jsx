import React, { useState } from 'react';
import './SummaryGenerator.css';

export function SummaryGenerator({ selftext_html }) {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const generateSummary = async () => {
    if (!selftext_html) {
      setError('No content to summarize');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      
      console.log('Sending request to /api/summarize with text length:', selftext_html.length);
      
      // Call your API endpoint
      const response = await fetch('http://localhost:3002/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: selftext_html }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      setSummary(data.summary);
      console.log('Tokens used:', data.tokenUsage);
      setExpanded(true);
      console.log('Summary received and set');
    } catch (err) {
      console.error('Error generating summary:', err);
      setError(`Failed to generate summary: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  
  return (
    <div className="summary-generator">
      <div className="summary-header">
        <h3>Post Summary</h3>
        <button 
          className="toggle-button"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? '−' : '+'}
        </button>
      </div>

      {expanded && (
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
      )}
    </div>
  );
} 