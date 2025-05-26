const express = require('express')
const cors = require('cors')
const fetch = require('node-fetch')
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

const app = express()
const port = 3001

// Log environment setup
console.log('Environment check:')
console.log('- Current directory:', __dirname)
console.log('- API Key exists:', !!process.env.ELEVENLABS_API_KEY)
console.log('- Env vars:', Object.keys(process.env))

app.use(cors())
app.use(express.json())

// Add endpoint to list available voices
app.get('/voices', async (req, res) => {
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.log('ElevenLabs API error details:', errorData);
      throw new Error(`Failed to fetch voices: ${JSON.stringify(errorData)}`);
    }
    
    const voices = await response.json();
    console.log('Available voices:', voices);
    res.json(voices);
  } catch (error) {
    console.error('Error fetching voices:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/tts', async (req, res) => {
  try {
    const { text } = req.body

    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not found. Please check your .env file in the root directory.')
    }

    // Using Archer voice - optimized for natural, conversational AI speech
    const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/L0Dsvb3SLTyegXwtm47J', {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.35,  // Lower stability for more natural variation
          similarity_boost: 0.85,  // Higher similarity for consistent personality
          style: 1.0,  // Full style for more expressive speech
          use_speaker_boost: true,
          speaking_rate: 1.1  // Slightly faster for more natural flow
        }
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.log('ElevenLabs API error details:', errorData)
      throw new Error(`ElevenLabs API request failed: ${JSON.stringify(errorData)}`)
    }

    const audioBuffer = await response.buffer()
    res.set('Content-Type', 'audio/mpeg')
    res.send(audioBuffer)
  } catch (error) {
    console.error('Error in TTS endpoint:', error)
    res.status(500).json({ error: error.message || 'Failed to generate speech' })
  }
})

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
}) 