import { useState, useCallback, useRef, useEffect } from 'react'

export function useSpeech(onTranscriptComplete, onSpeechDetected) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isSessionActive, setIsSessionActive] = useState(false)
  const recognitionRef = useRef(null)
  const transcriptRef = useRef('')
  const silenceTimeoutRef = useRef(null)
  const processingRef = useRef(false)
  const lastProcessedTranscriptRef = useRef('')
  const restartTimeoutRef = useRef(null)
  const recognitionRetryCountRef = useRef(0)
  const hasGreetedRef = useRef(false)
  const isAISpeakingRef = useRef(false)
  const audioContextRef = useRef(null)
  const streamRef = useRef(null)
  const volumeCheckIntervalRef = useRef(null)
  const silenceStartRef = useRef(null)

  const SILENCE_DURATION = 1000 // 1 second silence for end of speech
  const RESTART_DELAY = 200 // 200ms delay before restarting recognition
  const MAX_RETRY_COUNT = 5
  const RECONNECTION_INTERVAL = 500 // 500ms between reconnection attempts
  const VOLUME_THRESHOLD = 0.015 // Minimum volume to consider as speech
  const VOLUME_CHECK_INTERVAL = 100 // Check volume every 100ms
  const MIN_SPEECH_LENGTH = 2 // Minimum length in characters to process speech

  // Initialize audio context for volume detection
  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Setup volume monitoring
  const setupVolumeMonitoring = useCallback(async () => {
    try {
      if (streamRef.current) {
        const stream = streamRef.current;
        const audioContext = audioContextRef.current;
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkVolume = () => {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / bufferLength;
          const volume = average / 128.0; // Normalize to 0-1

          if (volume > VOLUME_THRESHOLD) {
            silenceStartRef.current = null;
          } else if (!silenceStartRef.current) {
            silenceStartRef.current = Date.now();
          } else if (Date.now() - silenceStartRef.current >= SILENCE_DURATION) {
            // If we have actual transcript and silence duration is met
            if (transcriptRef.current && transcriptRef.current.length >= MIN_SPEECH_LENGTH) {
              handleSpeechEnd();
            }
          }
        };

        volumeCheckIntervalRef.current = setInterval(checkVolume, VOLUME_CHECK_INTERVAL);
      }
    } catch (error) {
      console.error('Error setting up volume monitoring:', error);
    }
  }, []);

  const handleSpeechEnd = useCallback(async () => {
    if (processingRef.current || !transcriptRef.current) return;

    processingRef.current = true;
    const currentTranscript = transcriptRef.current;

    if (currentTranscript !== lastProcessedTranscriptRef.current && 
        currentTranscript.length >= MIN_SPEECH_LENGTH) {
      console.log('Processing final transcript:', currentTranscript);
      lastProcessedTranscriptRef.current = currentTranscript;
      await onTranscriptComplete(currentTranscript);
      transcriptRef.current = '';
      setTranscript('');
    }

    processingRef.current = false;
    
    // Restart recognition if session is still active
    if (isSessionActive && !isAISpeakingRef.current) {
      restartRecognition();
    }
  }, [onTranscriptComplete, isSessionActive]);

  const restartRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    setTimeout(() => {
      if (isSessionActive && !isAISpeakingRef.current) {
        startRecognition();
      }
    }, RESTART_DELAY);
  }, [isSessionActive]);

  const startRecognition = useCallback(async () => {
    if (!('webkitSpeechRecognition' in window)) {
      console.error('Speech recognition not supported');
      return;
    }

    try {
      // Request microphone access first
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      await setupVolumeMonitoring();

      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        console.log('Recognition started');
        setIsListening(true);
        processingRef.current = false;
        recognitionRetryCountRef.current = 0;
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let currentInterim = '';

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            const transcript = result[0].transcript.trim();
            if (transcript) {
              finalTranscript = transcript;
              transcriptRef.current = transcript;
              setTranscript(transcript);
            }
          } else {
            currentInterim += result[0].transcript;
          }
        }

        if (currentInterim) {
          setInterimTranscript(currentInterim);
          if (onSpeechDetected) {
            onSpeechDetected();
          }
        }
      };

      recognition.onerror = (event) => {
        console.error('Recognition error:', event.error);
        if (event.error === 'no-speech' || event.error === 'audio-capture') {
          handleRecognitionError();
        }
      };

      recognition.onend = () => {
        console.log('Recognition ended');
        setIsListening(false);
        setInterimTranscript('');
        
        if (isSessionActive && !isAISpeakingRef.current) {
          handleRecognitionError();
        }
      };

      recognitionRef.current = recognition;
      recognition.start();

    } catch (error) {
      console.error('Recognition initialization error:', error);
      handleRecognitionError();
    }
  }, [onSpeechDetected, isSessionActive, setupVolumeMonitoring]);

  const handleRecognitionError = useCallback(() => {
    if (recognitionRetryCountRef.current < MAX_RETRY_COUNT) {
      recognitionRetryCountRef.current++;
      console.log(`Retrying recognition (${recognitionRetryCountRef.current}/${MAX_RETRY_COUNT})`);
      
      setTimeout(() => {
        if (isSessionActive && !isAISpeakingRef.current && !processingRef.current) {
          startRecognition();
        }
      }, RESTART_DELAY + (RECONNECTION_INTERVAL * recognitionRetryCountRef.current));
    } else {
      recognitionRetryCountRef.current = 0;
      console.log('Max retries reached, forcing restart');
      restartRecognition();
    }
  }, [isSessionActive, startRecognition, restartRecognition]);

  const startSession = useCallback(() => {
    console.log('Starting session');
    setIsSessionActive(true);
    processingRef.current = false;
    lastProcessedTranscriptRef.current = '';
    recognitionRetryCountRef.current = 0;
    isAISpeakingRef.current = false;
    silenceStartRef.current = null;
    startRecognition();
  }, [startRecognition]);

  const stopSession = useCallback(() => {
    console.log('Stopping session');
    setIsSessionActive(false);
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (volumeCheckIntervalRef.current) {
      clearInterval(volumeCheckIntervalRef.current);
      volumeCheckIntervalRef.current = null;
    }

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }

    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }

    setIsListening(false);
    setInterimTranscript('');
    setTranscript('');
    transcriptRef.current = '';
    processingRef.current = false;
    lastProcessedTranscriptRef.current = '';
    recognitionRetryCountRef.current = 0;
    isAISpeakingRef.current = false;
    silenceStartRef.current = null;
  }, []);

  const setAISpeaking = useCallback((speaking) => {
    console.log('AI speaking:', speaking);
    isAISpeakingRef.current = speaking;
    
    if (speaking && recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    } else if (!speaking && isSessionActive) {
      setTimeout(() => {
        if (isSessionActive && !recognitionRef.current && !processingRef.current) {
          startRecognition();
        }
      }, RESTART_DELAY);
    }
  }, [isSessionActive, startRecognition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (volumeCheckIntervalRef.current) {
        clearInterval(volumeCheckIntervalRef.current);
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    transcript,
    interimTranscript,
    isListening,
    isSessionActive,
    startSession,
    stopSession,
    setAISpeaking
  };
} 