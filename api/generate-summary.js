import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that summarizes Reddit posts concisely. Create a brief, informative summary in 3-5 sentences."
        },
        {
          role: "user",
          content: `Please summarize the following Reddit post: ${text}`
        }
      ],
      max_tokens: 250,
      temperature: 0.5,
    });

    const summary = completion.data.choices[0].message.content.trim();
    return res.status(200).json({ summary });
  } catch (error) {
    console.error('Error in summary generation:', error);
    return res.status(500).json({ error: 'Failed to generate summary' });
  }
}
