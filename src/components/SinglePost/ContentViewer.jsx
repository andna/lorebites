import React, { useState, useRef, useEffect } from 'react';
import './ContentViewer.css'; // We'll continue using the same CSS for now

// Function to count words in HTML content
const countWords = (htmlContent) => {
  if (!htmlContent) return 0;
  // Remove HTML tags and replace <br> with spaces
  const plainText = htmlContent.replace(/<br\s*\/?>/gi, ' ').replace(/<\/?[^>]+(>|$)/g, '');
  // Count words (split by whitespace and filter out empty strings)
  return plainText.trim().split(/\s+/).filter(word => word.length > 0).length;
};

export function ContentViewer({ selftext_html, processedContent, contentRef }) {
  const [activeTab, setActiveTab] = useState('full');
  const [summaryData, setSummaryData] = useState({
    biteCut: { content: '' },
    shortCut: { content: '' }
  });
  const [wordCounts, setWordCounts] = useState({
    original: 0,
    biteCut: 0,
    shortCut: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dataReceivedRef = useRef(false);

  // Calculate word count for original content when component mounts
  useEffect(() => {
    setWordCounts(prev => ({
      ...prev,
      original: countWords(selftext_html)
    }));
  }, [selftext_html]);

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
    setWordCounts(prev => ({
      ...prev,
      biteCut: 0,
      shortCut: 0
    }));
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
        console.log('Received raw delta:', data.raw);
      } else {
        // Handle structured JSON with biteCut and shortCut
        setSummaryData(data);
        
        // Calculate word counts from the received data
        setWordCounts(prev => ({
          ...prev,
          biteCut: countWords(data.biteCut?.content),
          shortCut: countWords(data.shortCut?.content)
        }));
      }
    };

    eventSource.onerror = (err) => {
      if (!dataReceivedRef.current) {
        if (eventSource.readyState === EventSource.CLOSED) {
          setError('Failed to receive any data');
        } else {
          setError('Connection error - please try again');
        }
      }
      
      setLoading(false);
      eventSource.close();
    };

    eventSource.onopen = () => {
      setLoading(false);
    };
  };

  // Check if we need to generate summaries when user switches to a tab that needs them
  useEffect(() => {
    if ((activeTab === 'shortcut' || activeTab === 'bitecut') && 
        !summaryData.biteCut.content && !loading && !error) {
      generateSummary();
    }
  }, [activeTab]);

  const TabButton = ({ label, count, active, onClick }) => (
    <button
      className={`tab-button ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      <b>{label}</b> 
      <br />
      <small>{count > 0 && `${count} words`}</small>
    </button>
  );

  return (
    <div className="content-viewer">
      {/* Tab navigation */}

      <h3 className="content-title">Choose a length</h3> 
      
      <div className="content-tabs">
        <TabButton
          label="Full"
          count={wordCounts.original}
          active={activeTab === 'full'}
          onClick={() => setActiveTab('full')}
        />
        <TabButton
          label="Short"
          count={wordCounts.shortCut}
          active={activeTab === 'shortcut'}
          onClick={() => setActiveTab('shortcut')}
        />
        <TabButton
          label="Bite"
          count={wordCounts.biteCut}
          active={activeTab === 'bitecut'}
          onClick={() => setActiveTab('bitecut')}
        />
      </div>

      {/* Tab content */}
      <div className="tab-content">
        {activeTab === 'full' && (
          <div 
            className="post-content"
            ref={contentRef}
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />
        )}

        {activeTab === 'shortcut' && (
          <div className="post-content">
            {loading && <div className="loading">Generating summary...</div>}
            {error && <div className="error">{error}</div>}
            
            {summaryData.shortCut?.content ? (
              <div className="summary-text" dangerouslySetInnerHTML={{ __html: summaryData.shortCut.content }}></div>
            ) : !loading && !error && (
              <div className="generating-message">Generating Short Cut version...</div>
            )}
          </div>
        )}

        {activeTab === 'bitecut' && (
          <div className="post-content">
            {loading && <div className="loading">Generating summary...</div>}
            {error && <div className="error">{error}</div>}
            
            {summaryData.biteCut?.content ? (
              <div className="summary-text" dangerouslySetInnerHTML={{ __html: summaryData.biteCut.content }}></div>
            ) : !loading && !error && (
              <div className="generating-message">Generating Bite Cut version...</div>
            )}
          </div>
        )}

        {(activeTab === 'shortcut' || activeTab === 'bitecut') && summaryData.biteCut?.content && (
          <div className="button-container">
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
