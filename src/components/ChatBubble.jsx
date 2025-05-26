export default function ChatBubble({ role, content, isTyping, isSpeaking }) {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[80%] rounded-2xl p-4 backdrop-blur-sm
          ${isUser 
            ? 'bg-white/20 text-white border border-white/10' 
            : 'bg-white/10 text-white/90 border border-white/5'
          }
          ${isTyping ? 'animate-pulse' : ''}
          ${isSpeaking ? 'shadow-glow' : ''}
          transition-all duration-300
        `}
      >
        <div className="flex items-center space-x-2">
          <p className="text-sm leading-relaxed">{content}</p>
          {isSpeaking && (
            <div className="flex space-x-1 items-center">
              <div className="w-1.5 h-1.5 bg-current rounded-full animate-soundwave" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-current rounded-full animate-soundwave" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-current rounded-full animate-soundwave" style={{ animationDelay: '300ms' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 