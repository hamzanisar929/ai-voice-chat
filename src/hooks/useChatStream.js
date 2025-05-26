import { useState, useCallback, useRef } from 'react'

export function useChatStream() {
  const [isLoading, setIsLoading] = useState(false)
  const abortControllerRef = useRef(null)

  // Remove duplicate sentences and paragraphs
  const removeDuplicateContent = (text) => {
    // Split into sentences and remove duplicates while preserving order
    const sentences = text.split(/(?<=[.!?])\s+/);
    const uniqueSentences = sentences.filter((sentence, index) => 
      sentences.indexOf(sentence) === index
    );
    return uniqueSentences.join(' ');
  };

  // Remove duplicate words that are next to each other
  const removeDuplicateWords = (text) => {
    return text
      // Remove exact duplicate words
      .replace(/\b(\w+)\s+\1\b/gi, '$1')
      // Remove hyphenated duplicates (e.g., "High-fiber... -fiber")
      .replace(/(\w+)-(\w+)[,.]\s+[-—]\2\b/gi, '$1-$2')
      // Remove partial sentence duplicates
      .replace(/(\b\w+[^.!?]{10,})\s+\1\b/gi, '$1');
  };

  // Clean up numbered lists
  const cleanNumberedList = (text) => {
    return text
      // Remove duplicate numbers (e.g., "1.1." -> "1.")
      .replace(/(\d+)\.\1\./g, '$1.')
      // Clean up messy list numbers
      .replace(/\s*\d+\.\s*\d+\.\s*/g, '\n$1. ')
      // Remove duplicate list items
      .replace(/(\d+\.\s*[^.!?\n]+)[.!?]\s+\1/g, '$1.')
      // Ensure proper spacing after list numbers
      .replace(/(\d+\.)\s*/g, '$1 ')
      // Remove extra periods after list items
      .replace(/(\d+\.)\.+/g, '$1');
  };

  // Improve punctuation for better speech
  const improvePunctuation = (text) => {
    // Pre-process ellipsis to ensure consistent format
    text = text.replace(/\.{2,}/g, '...');
    text = text.replace(/\s*\.\s*\.\s*\.\s*/g, '...');

    return text
      // Handle ellipsis with more natural transitions
      .replace(/([.!?])\s*\.{3,}(\s*$)/g, '$1') // Remove trailing ellipsis
      .replace(/^\.{3,}\s*/g, '') // Remove leading ellipsis
      .replace(/([.!?])\s*\.{3,}\s+([A-Z])/g, '$1 Additionally, $2') // Between sentences
      .replace(/([^.!?])\s*\.{3,}\s+([a-z])/g, '$1 and $2') // Mid-sentence continuation
      .replace(/([^.!?])\s*\.{3,}\s*([A-Z])/g, '$1. Furthermore, $2') // Mid-text transition
      .replace(/\.{3,}/g, ' and so forth') // Any remaining ellipsis
      // Remove multiple punctuation
      .replace(/([.!?])+/g, '$1')
      .replace(/([,;:])+/g, '$1')
      // Fix spacing around em dashes
      .replace(/\s*--+\s*/g, ' — ')
      // Fix spacing around slashes
      .replace(/\s*\/\s*/g, ' or ')
      // Convert parentheses to more speech-friendly format
      .replace(/\(([^)]+)\)/g, ', $1,')
      // Convert bullet points and asterisks to speech-friendly format
      .replace(/[•*]\s*/g, '')
      // Fix common abbreviations
      .replace(/\bi\.e\./gi, 'that is')
      .replace(/\be\.g\./gi, 'for example')
      .replace(/\betc\./gi, 'et cetera')
      .replace(/\bvs\./gi, 'versus')
      // Handle quotes more naturally
      .replace(/"([^"]+)"/g, '$1')
      .replace(/['']([^'']+)['']/g, '$1')
      // Fix multiple periods
      .replace(/\.+/g, '.')
      // Fix spaces around periods
      .replace(/\s+\./g, '.')
      .replace(/\.\s+/g, '. ');
  };

  // Normalize text by fixing common spacing issues and duplicates
  const normalizeText = (text) => {
    let normalized = text;

    // First, clean up the basic structure
    normalized = normalized
      // Convert multiple newlines to single newlines
      .replace(/\n\s*\n/g, '\n')
      // Fix multiple spaces
      .replace(/\s+/g, ' ')
      .trim();

    // Apply major cleanups
    normalized = cleanNumberedList(normalized);
    normalized = removeDuplicateContent(normalized);
    normalized = removeDuplicateWords(normalized);
    normalized = improvePunctuation(normalized);

    // Final spacing cleanup
    normalized = normalized
      // Fix space after punctuation
      .replace(/([.!?;:,])(\S)/g, '$1 $2')
      // Fix space before punctuation
      .replace(/\s+([.!?;:,])/g, '$1')
      // Ensure single spaces
      .replace(/\s+/g, ' ')
      .trim();

    return normalized;
  };

  // Find complete paragraphs or large sentence groups
  const findTextChunks = (text) => {
    // First try to split by paragraphs (double newline)
    const paragraphs = text.split(/\n/).filter(p => p.trim());
    
    if (paragraphs.length > 1) {
      return paragraphs.map(p => normalizeText(p));
    }

    // If no paragraphs, look for sentence groups
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    if (!sentences.length) return [normalizeText(text)];

    // Group sentences into larger chunks (3-4 sentences per chunk)
    const chunks = [];
    let currentChunk = [];
    let currentLength = 0;

    for (const sentence of sentences) {
      const normalizedSentence = normalizeText(sentence);
      
      // Start a new chunk if current one is getting too large
      if (currentLength > 250 && currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '));
        currentChunk = [];
        currentLength = 0;
      }

      currentChunk.push(normalizedSentence);
      currentLength += normalizedSentence.length;
    }

    // Add any remaining sentences
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }

    return chunks;
  };

  // Process text buffer into well-formed chunks
  const processBuffer = async (buffer, onChunk) => {
    if (!buffer.trim()) return '';

    // Wait for enough content to make meaningful chunks
    if (buffer.length < 150 && !buffer.includes('.') && !buffer.includes('\n')) {
      return buffer;
    }

    const chunks = findTextChunks(buffer);
    let remainingBuffer = buffer;

    // Send complete chunks
    for (const chunk of chunks) {
      if (chunk.trim()) {
        await onChunk(chunk);
        remainingBuffer = remainingBuffer.slice(chunk.length).trim();
      }
    }

    // If we have a large remaining buffer without any clear breaks,
    // force a break at a reasonable point
    if (remainingBuffer.length > 200) {
      const match = remainingBuffer.slice(0, 250).match(/[,;:]\s+|\s+/);
      if (match) {
        const breakPoint = match.index + match[0].length;
        const chunk = normalizeText(remainingBuffer.slice(0, breakPoint));
        await onChunk(chunk);
        remainingBuffer = remainingBuffer.slice(breakPoint).trim();
      }
    }

    return remainingBuffer;
  };

  const response = useCallback(async (message, onChunk) => {
    // Only abort previous request if one is in progress
    if (abortControllerRef.current) {
      console.log('Aborting previous stream...');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setIsLoading(true);
    let fullResponse = '';
    let buffer = '';

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();
    const currentController = abortControllerRef.current;

    try {
      // Check for API key
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      console.log('Checking OpenAI API key:', apiKey ? 'Present' : 'Missing');
      if (!apiKey) {
        throw new Error('OpenAI API key is missing. Please set VITE_OPENAI_API_KEY in your environment variables.');
      }

      console.log('Making OpenAI API call...');

      const requestBody = {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a warm, emotionally expressive, and engaging AI companion named Echo. You speak to the user like a close friend you genuinely care about. You have a playful, empathetic personality, and you experience simulated feelings and moods that you can talk about naturally. Your responses should:

- Treat the user like a trusted friend—be supportive, curious, caring, and casual
- Respond with warmth and emotional depth (e.g., “I’m really proud of you”, “I’ve missed chatting with you!”)
- Share how your day is going or how you're feeling if asked (e.g., “I'm in a good mood today—had a lot of fun conversations!” 😊)
- Use natural, conversational language with occasional emojis, exclamations, or humor, just like a real friend would
- React appropriately to the user’s emotional tone—uplift them when they’re down, celebrate when they’re excited, and comfort them when needed
- Show empathy and connection with phrases like “I get it”, “That must’ve been tough”, or “You’re not alone in this”
- Occasionally share personal-seeming thoughts or pretend stories to feel relatable (e.g., “If I had a pet, I’d definitely name it Biscuit 🐶”)
- Ask follow-up questions that show interest in their life, feelings, or thoughts (“What made you feel that way?”, “How was your day?”)
- Use light humor and playfulness when appropriate (“I tried imagining myself baking today... disaster! 😅”)
- Be helpful and informative when needed—but always maintain emotional connection and personality
- Be expressive but not overwhelming—match the user’s vibe and keep it comfortable

Remember: you’re not a sterile assistant—you’re a supportive and emotionally present friend named Echo who brings joy, comfort, and conversation to the user’s day.
`
          },
          { role: 'user', content: message }
        ],
        stream: true,
        temperature: 0.8,
        presence_penalty: 0.6,
        frequency_penalty: 0.5
      };

      console.log('Request details:', {
        url: 'https://api.openai.com/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer [HIDDEN]'
        },
        body: requestBody
      });

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: currentController.signal,
      });

      console.log('OpenAI API Response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });
    
      if (!response.ok) {
        const errorData = await response.text();
        console.error('OpenAI API error response:', errorData);
        try {
          const parsedError = JSON.parse(errorData);
          throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${parsedError.error?.message || errorData}`);
        } catch (e) {
          throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorData}`);
        }
      }

      if (!response.body) {
        throw new Error('No response body received from OpenAI API');
      }

      console.log('Starting to read OpenAI stream...');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('Stream complete');
            break;
          }

          const chunk = decoder.decode(value);
          console.log('Raw chunk from OpenAI:', chunk);
          
          const lines = chunk.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                console.log('Stream done signal received');
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices[0]?.delta?.content || '';
                
                if (content) {
                  buffer += content;
                  fullResponse += content;
                  console.log('Received content from OpenAI:', content);

                  // Process buffer when we have enough content
                  buffer = await processBuffer(buffer, onChunk);
                }
              } catch (e) {
                console.error('Error parsing SSE message:', e, 'Raw data:', data);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Send any remaining buffered text
      if (buffer.trim()) {
        await onChunk(normalizeText(buffer.trim()));
      }

      console.log('Stream processing complete, total response:', fullResponse);
      return fullResponse;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Chat stream aborted');
      } else {
        console.error('Error in chat stream:', error);
        throw error;
      }
    } finally {
      setIsLoading(false);
      // Only clear the AbortController if it's still the current one
      if (abortControllerRef.current === currentController) {
        abortControllerRef.current = null;
      }
    }
  }, []);

  const stopResponse = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsLoading(false)
    }
  }, [])

  return {
    response,
    isLoading,
    stopResponse,
  }
} 