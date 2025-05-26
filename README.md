# AI Voice Chat Assistant

A real-time voice chat application that enables natural conversations with an AI assistant. Built with React, OpenAI GPT-4, and ElevenLabs for voice synthesis.

## Features

- 🎙️ Real-time speech recognition with advanced voice activity detection
- 🤖 Natural conversations with GPT-4
- 🗣️ High-quality voice synthesis using ElevenLabs
- ⚡ Instant response streaming
- 🔄 Seamless turn-taking between user and AI
- 🎯 Interruption handling - AI stops when user starts speaking
- 📊 Visual feedback with voice activity visualization
- 💫 Beautiful, modern UI with glass-morphism design

## Prerequisites

Before you begin, ensure you have:
- Node.js (v16 or higher)
- npm or yarn
- OpenAI API key
- ElevenLabs API key

## Setup

1. Clone the repository:
```bash
git clone [repository-url]
cd ai-voice-chat
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env` file in the root directory:
```env
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_ELEVEN_LABS_API_KEY=your_elevenlabs_api_key
```

4. Start the development server:
```bash
npm run dev
# or
yarn dev
```

## Usage

1. Click the "Start Session" button to begin a conversation
2. Start speaking - the AI will listen and respond naturally
3. You can interrupt the AI at any time by starting to speak
4. Click "End Session" when you're done

## Technical Details

### Speech Recognition
- Uses Web Speech API with advanced voice activity detection
- Real-time volume analysis using Web Audio API
- Sophisticated silence detection and speech end detection
- Automatic recovery from recognition errors

### AI Integration
- Streams responses from GPT-4 in real-time
- Handles conversation context
- Provides natural, contextual responses

### Voice Synthesis
- High-quality voice synthesis using ElevenLabs
- Real-time streaming of AI responses
- Natural voice with proper intonation and emphasis

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 