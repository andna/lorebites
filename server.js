const express = require('express');
const cors = require('cors');
const OpenAI = require('openai'); // Updated import
const app = express();
const port = 3002;

// Initialize OpenAI with the current SDK pattern
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json());

app.post('/api/summarize', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    console.log('Received text to summarize:', text.substring(0, 100) + '...');
    
    // Call OpenAI API with current SDK pattern
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant that summarizes text concisely." },
        { role: "user", content: `Please provide a concise summary of the following text in 2-3 paragraphs:\n\n${text}` }
      ],
      max_tokens: 350,
      temperature: 0.7,
    });

    // Extract summary from response
    const summary = completion.choices[0].message.content.trim();
    console.log('Generated summary:', summary.substring(0, 100) + '...');
    
    res.json({ summary });
  } catch (error) {
    console.error('OpenAI API Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate summary', 
      details: error.message 
    });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`OpenAI API Key configured: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
});