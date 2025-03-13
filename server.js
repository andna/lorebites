const express = require('express');
const cors = require('cors');
// const { Anthropic } = require('@anthropic-ai/sdk');
const fetch = require('node-fetch');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

app.use((req, res, next) => {
    if (req.url.endsWith('.js')) {
        res.type('application/javascript');
    }
    next();
});

// const anthropic = new Anthropic({
//     apiKey: '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'
// });

app.post('/summarize', async (req, res) => {
    // Temporary response while we work on UX
    res.json({ summary: "AI summarization temporarily disabled while working on UX improvements." });
    
    /* Original AI code commented out
    try {
        const msg = await anthropic.messages.create({
            model: "claude-3-sonnet-20240229",
            max_tokens: 150,
            messages: [{
                role: "user",
                content: `Please provide a very brief 1-2 sentence summary of this Reddit post: ${req.body.text}`
            }]
        });

        console.log('Claude API response:', msg);
        res.json({ summary: msg.content[0].text });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to get summary' });
    }
    */
});

// Endpoint to fetch posts from a subreddit
app.get('/posts/:subreddit', async (req, res) => {
    try {
        const subreddit = req.params.subreddit;
        const sort = req.query.sort || 'hot';
        const timeRange = req.query.t || 'day';
        
        let url = `https://www.reddit.com/r/${subreddit}/${sort}.json?limit=10`;
        if (sort === 'top') {
            url += `&t=${timeRange}`;
        }

        console.log(`Fetching ${sort} posts from r/${subreddit}...`);
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.message || 'Reddit API error');
        }

        if (!data.data || !Array.isArray(data.data.children)) {
            throw new Error('Unexpected Reddit API response format');
        }

        const posts = data.data.children.reduce((result, child) => {
            if (child.data.is_robot_indexable && child.data.is_self) {
                result.push(child.data);
            }
            return result;
        }, []);

        console.log(`Successfully fetched ${posts.length} ${sort} posts`);
        res.json(posts);

    } catch (error) {
        console.error('Error details:', error);
        res.status(500).json({ 
            error: 'Failed to fetch posts', 
            message: error.message 
        });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
}); 