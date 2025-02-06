export default function converse({
  model = 'deepseek-r1:14b',
  message,
  system,
  onDone,
  parseChunk,
  parseLine,
}) {
  // Create a new AbortController for this conversation
  const controller = new AbortController();
  const { signal } = controller;

  // Build the request body
  const bodyJSON = JSON.stringify({
    message,
    model,
    system,
  });

  // Wrap the asynchronous work in an immediately invoked async function
  const conversationPromise = (async () => {
    try {
      const response = await fetch('/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: bodyJSON,
        signal, // attach the abort signal
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let lines = [];
      let currentLine = "";

      const parseChar = (ch) => {
        if (ch !== "\n") {
          currentLine += ch;
          return;
        }
        lines.push(currentLine);
        currentLine = "";
      };

      while (true) {
        const { done, value } = await reader.read();
        let lineTop = lines.length;
        if (done) {
          if (currentLine.length) {
            lines.push(currentLine);
          }
        } else {
          const textChunk = decoder.decode(value, { stream: true });
          for (let i = 0; i < textChunk.length; i++) {
            const ch = textChunk.charAt(i);
            parseChar(ch);
          }
          if (parseChunk) {
            parseChunk(textChunk);
          }
        }
        while (lineTop < lines.length) {
          if (parseLine) {
            parseLine(lines[lineTop]);
          }
          lineTop++;
        }
        if (done) break;
      }

      if (onDone) {
        onDone({
          prompt: message,
          bodyJSON,
          response,
        });
      }
    } catch (err) {
      if (err.name === "AbortError") {
        console.log("Fetch aborted: Client disconnected.");
      } else {
        console.error("Fetch error:", err);
      }
    }
  })();

  // Return an object exposing the promise and a stop method.
  return {
    promise: conversationPromise,
    stop: () => 
        controller.abort(),
  };
}
