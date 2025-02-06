export default function converse({
  model = 'deepseek-r1:14b',
  message = '',
  system = '',
  onDone,
  parseChunk,
  parseLine
}) {
  // Create an AbortController for this conversation
  const controller = new AbortController();
  const { signal } = controller;

  // Fallback no-ops for optional callbacks
  parseChunk = parseChunk || (() => {});
  parseLine = parseLine || (() => {});
  onDone = onDone || (() => {});

  // Build the request body once
  const bodyJSON = JSON.stringify({ message, model, system });

  // The main async process
  const conversationPromise = (async () => {
    try {
      const response = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyJSON,
        signal
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let lines = [];
      let currentLine = '';

      // Helper to accumulate lines
      function processChar(ch) {
        if (ch === '\n') {
          lines.push(currentLine);
          currentLine = '';
        } else {
          currentLine += ch;
        }
      }

      while (true) {
        const { done, value } = await reader.read();

        // Start from the end of the 'lines' array
        let lineIndex = lines.length;

        if (done) {
          // If there's any leftover content in currentLine, push as final line
          if (currentLine) lines.push(currentLine);
        } else {
          // Decode chunk and pass to parseChunk callback
          const textChunk = decoder.decode(value, { stream: true });
          parseChunk(textChunk);

          // Break the chunk into lines
          for (const ch of textChunk) {
            processChar(ch);
          }
        }

        // Process any new lines with parseLine
        while (lineIndex < lines.length) {
          parseLine(lines[lineIndex]);
          lineIndex++;
        }

        // If the stream is done, exit the loop
        if (done) break;
      }

      // Done callback with final info
      onDone({ prompt: message, bodyJSON, lines });
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Fetch aborted: Client disconnected.');
      } else {
        console.error('Fetch error:', err);
      }
    }
  })();

  return {
    promise: conversationPromise,
    stop: () => controller.abort()
  };
}
