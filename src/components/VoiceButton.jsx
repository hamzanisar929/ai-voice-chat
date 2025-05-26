import { useState } from 'react'

export default function VoiceButton({ onStart, onStop, isListening }) {
  return (
    <button
      className={`
        w-16 h-16 rounded-full flex items-center justify-center
        transition-all duration-200 ease-in-out
        ${isListening 
          ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
          : 'bg-primary hover:bg-primary/90'
        }
        shadow-lg hover:shadow-xl
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
      `}
      onClick={() => isListening ? onStop() : onStart()}
      aria-label={isListening ? "Click to Send Message" : "Click to Start Speaking"}
    >
      {isListening ? (
        // Send icon
        <svg
          className="w-8 h-8 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14 5l7 7m0 0l-7 7m7-7H3"
          />
        </svg>
      ) : (
        // Microphone icon
        <svg
          className="w-8 h-8 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
      )}
    </button>
  )
} 