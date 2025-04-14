import { Configuration, OpenAIApi } from 'openai';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS method for CORS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse request body
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Initialize OpenAI
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);

    // Call OpenAI API
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that summarizes text concisely."
        },
        {
          role: "user",
          content: `Please provide a concise summary of the following text in 2-3 paragraphs:\n\n${text}`
        }
      ],
      max_tokens: 350,
      temperature: 0.7,
    });

    // Extract and return the summary
    const summary = response.data.choices[0].message.content.trim();
    
    res.status(200).json({ summary });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
} 