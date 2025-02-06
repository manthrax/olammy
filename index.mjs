import express from 'express';
import ollama from 'ollama';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 3000;
// Change this to your desired port

app.use(express.json());
// Middleware to parse JSON requests
app.use(express.static('public'));

app.post('/chat', async (req, res) => {
    const system = req.body.system;
    const model = req.body.model || 'deepseek-r1:32b';
    const message = req.body.message || 'Hello!';
    const messages = req.body.messages || [{
        role: 'user',
        content: message
    }];
    /*
deepseek-r1:1.5b    --- looped forever
deepseek-r1:7b      --- terrible.
deepseek-r1:14b     --- can occasionally write good code 1 out of 4
deepseek-r1:32b     --- writes good code 2 out of 3 times...
deepseek-r1:70b     --- wrote good code 1st try but took about 10 minutes...

//'deepseek-r1:32b',//''deepseek-r1:32b',

*/
    let controller = new AbortController();


    
    try {
        console.log("sending:", system, model, message)
        res.setHeader('Content-Type', 'text/plain');

        const responseStream = await ollama.chat({
            model,
            messages,
            //system,
            stream: true,
            timeout: 30000,
            signal: controller.signal,
            options: {
                seed: 123,
                //temperature: 0.01
                temperature: 0.1,
                // Stick to predictable GLSL outputs
                
                max_tokens: 1000,
                // Prevent long responses
                top_k: 20,
                // Reduce random token choices
                top_p: 0.8,
                // Balance predictability and variation
                //stop: ["vec4"]      // Stop when another function starts                
                //stop:
            }
        });

        // Detect when the client disconnects
        req.on('close', () => {
            console.log("Client disconnected, stopping stream.");
            responseStream.return();
            // Stop async generator
            controller.abort();
            controller = null;
        }
        );

        for await(const chunk of responseStream) {
            res.write(chunk.message.content);
            if(!controller)
                break;
        }
        res.end();
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Request aborted due to client disconnect.');
        } else if (!res.writableEnded) {
            console.error('Error during chat processing:', error);
            res.status(500).json({
                error: error.message
            });
        }
    }
}
);

app.listen(PORT, () => {
    console.log(`Chatbot server running on http://localhost:${PORT}`);
}
);
//-----------
//report installed models...
app.get('/models', async (req, res) => {
    try {
        const models = await ollama.list();
        res.json(models);
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
}
);

//-----------------   FILE SAVE
let uploadDir = 'data/'

app.use(express.static(uploadDir))



// Function to generate an auto-incrementing filename
const getNextFilename = (originalname) => {
    const ext = path.extname(originalname);
    const baseName = path.basename(originalname, ext);

    let counter = 1;
    let newFilename = `${baseName}_${counter}${ext}`;
    
    while (fs.existsSync(path.join(uploadDir, newFilename))) {
        counter++;
        newFilename = `${baseName}_${counter}${ext}`;
    }

    return newFilename;
};

// Set up storage directory and Multer configuration
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        const newFilename = getNextFilename(file.originalname);
        console.log("Saving user generated JSON as:",newFilename)
        cb(null, newFilename) // file.originalname);
    }
});

const upload = multer({
    storage: storage
});

app.post('/upload', upload.single('file'), (req, res) => {
    res.status(201).send('File uploaded successfully');
}
);

// Serve directory contents
app.get('/files', (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Unable to list files' });
        }
        res.json(files);
    });
});

app.get('/files/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'data', filename);

    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('File not found');
    }
}
);

app.post('/upload-json', (req, res) => {
    const jsonData = req.body;
    const filePath = path.join(__dirname, 'data', 'jsonData.json');
    // Save JSON data as jsonData.json
    jsonData.filePath = filePath;
    fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf8', (err) => {
        if (err) {
            console.error('Error writing JSON to file:', err);
            res.status(500).send('Error saving JSON');
        } else {
            console.log('Wrote JSON to file:', filePath);
            res.send(`${filePath}`);
        }
    }
    );
}
);
