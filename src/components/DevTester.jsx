import React, { useState, useEffect } from 'react';
import { SinglePost } from './SinglePost';
import './DevTester.css';

export function DevTester() {
  const [htmlInput, setHtmlInput] = useState('<p>This is a test paragraph. You can edit this HTML to test the SinglePost component and audio playback functionality.</p>');
  const [mockPost, setMockPost] = useState(null);

  // Generate mock post data from HTML input
  useEffect(() => {
    // Create a mock post object with the HTML content
    const newMockPost = {
      id: 'dev-test',
      title: 'Dev Test Post',
      author: 'dev_user',
      created_utc: Date.now() / 1000,
      selftext: htmlInput.replace(/<[^>]*>/g, ''), // Plain text version
      selftext_html: encodeHtmlForRedditFormat(htmlInput),
      subreddit: 'dev_testing',
      score: 100,
      num_comments: 0,
      permalink: '/r/dev_testing/comments/dev-test/dev_test_post'
    };

    setMockPost(newMockPost);
  }, [htmlInput]);

  // Reddit uses HTML with an extra level of encoding
  function encodeHtmlForRedditFormat(html) {
    // First encode the HTML for JSON
    const jsonEncoded = JSON.stringify(html).slice(1, -1);
    // Then wrap it as Reddit would
    return `&lt;!-- SC_OFF --&gt;&lt;div class="md"&gt;${jsonEncoded}&lt;/div&gt;&lt;!-- SC_ON --&gt;`;
  }

  return (
    <div className="dev-tester">
      <div className="dev-controls">
        <h2>Dev Testing Environment</h2>
        <div className="textarea-container">
          <label htmlFor="html-input">Input HTML:</label>
          <textarea
            id="html-input"
            value={htmlInput}
            onChange={(e) => setHtmlInput(e.target.value)}
            rows={10}
          />
        </div>
      </div>

      <div className="dev-preview">
        <h3>Preview:</h3>
        {mockPost && (
          <div className="post-preview">
            <SinglePost post={mockPost} />
          </div>
        )}
      </div>
    </div>
  );
} 