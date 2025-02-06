// server.mjs

/*
deepseek-r1:1.5b    --- looped forever
deepseek-r1:7b      --- terrible.
deepseek-r1:14b     --- can occasionally write good code 1 out of 4
deepseek-r1:32b     --- writes good code 2 out of 3 times...
deepseek-r1:70b     --- wrote good code 1st try but took about 10 minutes...
*/


import express from 'express';
import ollama from 'ollama';
import multer from 'multer';
import { promises as fs, existsSync } from 'fs';
import { dirname, join, extname, basename } from 'path';
import { fileURLToPath } from 'url';

// Setup __dirname in ESM
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = 3000;

// Parse JSON from requests & serve static files in 'public'
app.use(express.json());
app.use(express.static('public'));

// Serve /data/* from the 'data' folder
//app.use('/data', express.static(join(__dirname, 'data')));

// ------------------- Chat Route -------------------
app.post('/chat', async (req, res) => {
  const system = req.body.system;
  const model = req.body.model || 'deepseek-r1:32b';
  const message = req.body.message || 'Hello!';
  const messages = req.body.messages || [{ role: 'user', content: message }];

  let controller = new AbortController();

  try {
    console.log("sending:", system, model, message);
    res.setHeader('Content-Type', 'text/plain');

    const responseStream = await ollama.chat({
      model,
      messages,
      stream: true,
      timeout: 30000,
      signal: controller.signal,
      options: {
        seed: 123,
        temperature: 0.1,
        max_tokens: 1000,
        top_k: 20,
        top_p: 0.8
      }
    });

    // If client disconnects, abort the stream
    req.on('close', () => {
      console.log("Client disconnected, stopping stream.");
      responseStream.return();
      controller.abort();
      controller = null;
    });

    for await (const chunk of responseStream) {
      if (!controller) break; // If aborted, stop writing
      res.write(chunk.message.content);
    }
    res.end();

  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Request aborted due to client disconnect.');
    } else if (!res.writableEnded) {
      console.error('Error during chat processing:', error);
      res.status(500).json({ error: error.message });
    }
  }
});

// ------------------- Models Route -------------------
app.get('/models', async (req, res) => {
  try {
    const models = await ollama.list();
    res.json(models);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ------------------- File Upload & Listing -------------------
const uploadDir = 'public/data'; // or 'data/'

// Rebuild data.json with updated directory listing
async function rebuildDirectoryJSON() {
  try {
    const directoryPath = join(__dirname, uploadDir);
    const files = await fs.readdir(directoryPath);
    const outputPath = join(__dirname, 'public', 'data.json');
    await fs.writeFile(outputPath, JSON.stringify(files, null, 2), 'utf8');
    console.log('File list saved to data.json successfully.');
  } catch (err) {
    console.error('Error processing directory:', err);
  }
}

rebuildDirectoryJSON()

// Auto-incrementing filename if file already exists
function getNextFilename(originalname) {
  const ext = extname(originalname);
  const baseName = basename(originalname, ext);

  let counter = 1;
  let newFilename = `${baseName}_${counter}${ext}`;
  while (existsSync(join(uploadDir, newFilename))) {
    counter++;
    newFilename = `${baseName}_${counter}${ext}`;
  }
  return newFilename;
}

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const newFilename = getNextFilename(file.originalname);
    console.log("Saving user file as:", newFilename);
    cb(null, newFilename);
  }
});
const upload = multer({ storage });

// Upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  res.status(201).send('File uploaded successfully');
  rebuildDirectoryJSON();
});

/*
// List all files in the uploadDir
app.get('/files', async (req, res) => {
  try {
    const files = await fs.readdir(uploadDir);
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: 'Unable to list files' });
  }
});
*/

// Save JSON via POST
app.post('/upload-json', async (req, res) => {
  try {
    const jsonData = req.body;
    const filePath = join(__dirname, uploadDir, 'jsonData.json');
    await fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf8');
    console.log('Wrote JSON to file:', filePath);
    res.send(filePath);
  } catch (err) {
    console.error('Error writing JSON to file:', err);
    res.status(500).send('Error saving JSON');
  }
});

// ------------------- Start Server -------------------
app.listen(PORT, () => {
  console.log(`Chatbot server running on http://localhost:${PORT}`);
});
