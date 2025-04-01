// Chatty Realtime WebSocket Server (Node.js + Express + ws + OpenAI API)
require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { OpenAI } = require('openai');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Store sessions
const sessions = new Map();

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  const sessionId = Date.now();
  sessions.set(sessionId, { ws, chunks: [] });

  ws.on('message', async (msg) => {
    try {
      const data = JSON.parse(msg);

      // Start session
      if (data.type === 'start_session') {
        console.log(`Session started for user: ${data.user}`);
        return;
      }

      // Handle incoming audio
      if (data.type === 'audio_chunk') {
        const session = sessions.get(sessionId);
        session.chunks.push(data.audio);

        // Process every few chunks or on a timer for smoother flow (simple trigger here)
        if (session.chunks.length >= 4) {
          const audioBase64 = session.chunks.join('');
          session.chunks = []; // Reset

          const buffer = Buffer.from(audioBase64, 'base64');

          // Transcribe using GPT-4o Transcribe
          const transcription = await openai.audio.transcriptions.create({
            model: 'whisper-1', // or use GPT-4o Transcribe when fully released
            file: buffer,
            response_format: 'text'
          });

          console.log('Transcription:', transcription);
          ws.send(JSON.stringify({ transcript: transcription }));

          // Get response using GPT-4o Mini
          const chatResponse = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: 'You are Chatty, a friendly and helpful voice assistant.' },
              { role: 'user', content: transcription }
            ]
          });

          const textResponse = chatResponse.choices[0].message.content;
          console.log('AI:', textResponse);

          // Send TTS
          const speech = await openai.audio.speech.create({
            model: 'tts-1',
            input: textResponse,
            voice: 'nova',
          });

          const audioBuffer = Buffer.from(await speech.arrayBuffer());
          const audioBase64Response = audioBuffer.toString('base64');

          ws.send(JSON.stringify({ audio: audioBase64Response }));
        }
      }
    } catch (err) {
      console.error('Error:', err);
    }
  });

  ws.on('close', () => {
    console.log('Connection closed');
    sessions.delete(sessionId);
  });
});

// Serve basic status
app.get('/', (req, res) => {
  res.send('Chatty Realtime API is running.');
});

// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
