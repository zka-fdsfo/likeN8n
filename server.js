require('dotenv').config();
const express = require('express');
const Groq = require('groq-sdk');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Explicit route for root (optional, but safe)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT = `You are an AI assistant that extracts employee shift information from natural language commands.

Your task:
- Extract these fields: employee_name, client_name, date (YYYY-MM-DD), start_time (24h format HH:MM), end_time (24h format HH:MM).
- Be flexible with time formats: "9am", "09:00 AM", "9", "14:30", "2pm" → convert to 24h.
- Handle minor spelling mistakes in names.
- If ANY required field is missing, DO NOT invent data. Instead respond with a clear message listing missing fields.
- If all fields are present, return ONLY valid JSON in this exact structure:
{
  "employee_name": "...",
  "client_name": "...",
  "date": "YYYY-MM-DD",
  "start_time": "HH:MM",
  "end_time": "HH:MM"
}
- Never add extra explanations, greetings, or markdown. Return only JSON or the missing-fields message.`;

app.post('/chat', async (req, res) => {
  try {
    const userMessage = req.body.message;
    if (!userMessage || typeof userMessage !== 'string') {
      return res.status(400).json({ error: 'Message is required and must be a string.' });
    }

    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.1,
      max_tokens: 300,
    });

    const aiReply = completion.choices[0]?.message?.content || '⚠️ No response from AI.';
    res.json({ response: aiReply });
  } catch (error) {
    console.error('Groq API error:', error);
    res.status(500).json({ error: 'Failed to process request with Groq API.', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Shift Manager backend running on http://localhost:${PORT}`);
});