import { useState, useCallback, useEffect } from 'react'
import VoiceButton from './components/VoiceButton'
import ChatBubble from './components/ChatBubble'
import VoiceOrb from './components/VoiceOrb'
import { useSpeech } from './hooks/useSpeech'
import { useChatStream } from './hooks/useChatStream'
import { useElevenLabs } from './hooks/useElevenLabs'

function App() {
  const [messages, setMessages] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  
  const { response, isLoading: isChatLoading, stopResponse } = useChatStream()
  const { isPlaying, playAudio, stopAudio } = useElevenLabs()

  // Handle speech detection during AI response
  const handleSpeechDetected = useCallback(() => {
    if (isPlaying) {
      console.log('User started speaking - stopping AI response');
      stopAudio();
      stopResponse();
    }
  }, [isPlaying, stopAudio, stopResponse]);

  // Handle completed transcripts
  const handleTranscriptComplete = useCallback(async (finalTranscript) => {
    if (!finalTranscript) return;
    
    try {
      console.log('Starting to process transcript:', finalTranscript);
      
      // Add user message immediately
      setMessages(prev => [...prev, { role: 'user', content: finalTranscript }]);

      // Add empty assistant message that will be updated
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      console.log('About to call OpenAI response...');
      // Stream the response and update the message in real-time
      await response(finalTranscript, async (chunk) => {
        console.log('Received chunk from OpenAI:', chunk);
        // Update the last message (assistant's message) with the new chunk
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage.role === 'assistant') {
            lastMessage.content += chunk;
          }
          return newMessages;
        });

        // Send the chunk to ElevenLabs for real-time TTS
        try {
          await playAudio(chunk);
        } catch (error) {
          console.error('Error playing audio:', error);
        }
      });

      console.log('OpenAI response completed successfully');
    } catch (error) {
      console.error('Detailed error in chat response:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      setError(error.message);
      // Remove the empty assistant message if there was an error
      setMessages(prev => prev.slice(0, -1));
    }
  }, [response, playAudio, setMessages, setError]);

  const { 
    transcript, 
    interimTranscript, 
    isListening, 
    isSessionActive,
    startSession,
    stopSession,
    setAISpeaking 
  } = useSpeech(handleTranscriptComplete, handleSpeechDetected)

  // Update AI speaking status whenever isPlaying changes
  useEffect(() => {
    setAISpeaking(isPlaying)
  }, [isPlaying, setAISpeaking])

  // Check for API key on mount
  useEffect(() => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      setError('OpenAI API key is missing. Please check your .env file.');
      console.error('OpenAI API key is missing');
    } else {
      console.log('OpenAI API key is present');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 text-white flex flex-col relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 via-purple-500/30 to-pink-500/30 animate-gradient-shift pointer-events-none"></div>
      
      {/* Floating orbs in background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl animate-float-slow"></div>
      </div>

      <div className="flex-1 container mx-auto max-w-2xl p-4 relative z-10">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 mb-4 min-h-[400px] relative">
          {/* Glass effect card */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 rounded-2xl pointer-events-none"></div>
          
          {/* Session status indicator */}
          <div className={`absolute top-4 right-4 flex items-center space-x-2 ${isSessionActive ? 'text-green-400' : 'text-gray-400'}`}>
            <div className={`w-2 h-2 rounded-full ${isSessionActive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-sm">
              {isSessionActive 
                ? isPlaying 
                  ? 'AI Speaking...' 
                  : isListening 
                    ? 'Listening...'
                    : 'Ready'
                : 'Session Inactive'}
            </span>
          </div>

          {/* Orb container */}
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] z-50">
            <VoiceOrb isListening={isListening} isSpeaking={isPlaying} />
          </div>

          {/* Messages container */}
          <div className="space-y-4 relative z-10 min-h-[600px] overflow-y-auto">
            {error && (
              <div className="bg-red-500/20 backdrop-blur border border-red-500/50 text-red-100 px-4 py-3 rounded-lg relative" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            
            {messages.map((message, index) => (
              <ChatBubble
                key={index}
                role={message.role}
                content={message.content}
                isTyping={isChatLoading && index === messages.length - 1}
                isSpeaking={isPlaying && index === messages.length - 1}
              />
            ))}
            
            {isListening && interimTranscript && (
              <ChatBubble
                role="user"
                content={interimTranscript}
                isTyping={true}
              />
            )}
            
            {messages.length === 0 && !interimTranscript && !error && (
              <div className="text-center text-white/70 py-8">
                {isSessionActive 
                  ? "Start speaking whenever you're ready..."
                  : "Click 'Start Session' to begin a conversation"}
              </div>
            )}
          </div>
        </div>
        
        {/* Session control button */}
        <div className="flex justify-center mt-8 space-x-4">
          <button
            onClick={isSessionActive ? stopSession : startSession}
            className={`
              px-6 py-3 rounded-lg font-medium text-lg
              transition-all duration-200 ease-in-out
              ${isSessionActive 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
              }
              shadow-lg hover:shadow-xl
              focus:outline-none focus:ring-2 focus:ring-offset-2
              ${isSessionActive ? 'focus:ring-red-500' : 'focus:ring-green-500'}
            `}
          >
            {isSessionActive ? 'End Session' : 'Start Session'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default App 