import { useState, useCallback, useRef, useEffect } from 'react'

export function useElevenLabs() {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioContextRef = useRef(null)
  const audioQueueRef = useRef([])
  const isProcessingRef = useRef(false)
  const currentSourceRef = useRef(null)
  const nextStartTimeRef = useRef(0)

  useEffect(() => {
    // Initialize AudioContext
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
    
    return () => {
      if (currentSourceRef.current) {
        currentSourceRef.current.stop()
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  const processAudioQueue = async () => {
    if (isProcessingRef.current || audioQueueRef.current.length === 0) return
    
    isProcessingRef.current = true
    setIsPlaying(true)

    try {
      while (audioQueueRef.current.length > 0) {
        const audioData = audioQueueRef.current.shift()
        const audioBuffer = await audioContextRef.current.decodeAudioData(audioData)
        
        const source = audioContextRef.current.createBufferSource()
        source.buffer = audioBuffer

        // Calculate precise timing
        const currentTime = audioContextRef.current.currentTime
        const startTime = Math.max(currentTime, nextStartTimeRef.current)

        // Connect and start
        source.connect(audioContextRef.current.destination)
        source.start(startTime)

        // Update timing for next chunk
        nextStartTimeRef.current = startTime + audioBuffer.duration - 0.05 // Small overlap

        // Store current source and wait for it to finish
        if (currentSourceRef.current) {
          currentSourceRef.current.stop(startTime)
        }
        currentSourceRef.current = source

        // Wait for this chunk to start before processing next
        // but don't wait for it to finish
        await new Promise(resolve => setTimeout(resolve, 10))
      }
    } catch (error) {
      console.error('Error processing audio queue:', error)
    } finally {
      isProcessingRef.current = false
      if (audioQueueRef.current.length === 0) {
        setIsPlaying(false)
        currentSourceRef.current = null
      } else {
        // If there's more audio, process it
        processAudioQueue()
      }
    }
  }

  const playAudio = useCallback(async (text) => {
    if (!text.trim()) return
    if (!audioContextRef.current) {
      console.error('AudioContext not initialized')
      return
    }

    try {
      // Resume AudioContext if it's suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
      }

      const response = await fetch('http://localhost:3001/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text.trim() }),
      })

      if (!response.ok) throw new Error('TTS request failed')

      const audioData = await response.arrayBuffer()
      audioQueueRef.current.push(audioData)
      
      if (!isProcessingRef.current) {
        await processAudioQueue()
      }
    } catch (error) {
      console.error('Error queuing audio:', error)
      setIsPlaying(false)
    }
  }, [])

  const stopAudio = useCallback(() => {
    if (currentSourceRef.current) {
      currentSourceRef.current.stop()
      currentSourceRef.current = null
    }
    audioQueueRef.current = []
    isProcessingRef.current = false
    nextStartTimeRef.current = 0
    setIsPlaying(false)
  }, [])

  return {
    isPlaying,
    playAudio,
    stopAudio,
  }
} 