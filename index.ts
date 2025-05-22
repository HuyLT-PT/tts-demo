import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const app = express();
const router = express.Router();
const port = 8888;

// Rate limiting configuration
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after a minute',
    standardHeaders: true,
    legacyHeaders: false,
});

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const models = ['gemini-2.5-pro-preview-tts', 'gemini-2.5-flash-preview-tts'];

async function saveWaveFile(filename: string, audioData: Buffer) {
    try {
        console.log('Saving audio file to:', filename);
        await fs.writeFile(filename, audioData);
        console.log('File saved successfully');
        
        // Verify file exists and get its size
        const stats = await fs.stat(filename);
        console.log('File size:', stats.size, 'bytes');
        return true;
    } catch (error) {
        console.error('Error saving file:', error);
        throw error;
    }
}

router.post('/convert', async (req: any, res: any) => {
    try {
        console.log('Received request:', req.body);
        const { text } = req.body as { text: string };
        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        const randomModel = models[Math.floor(Math.random() * models.length)];
        console.log('Using model:', randomModel);
        
        const response = await ai.models.generateContent({
            model: randomModel,
            contents: [{ parts: [{ text: `Say cheerfully: ${text}` }] }],
            config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });

        console.log('Received response from Gemini API');
        const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!data) {
            console.error('No audio data in response:', response);
            throw new Error('No audio data received');
        }

        const audioBuffer = Buffer.from(data, 'base64');
        const timestamp = new Date().getTime();
        const fileName = `${timestamp}.wav`; // Save directly in root directory
        
        console.log('Saving audio file:', fileName);
        await fs.writeFile(fileName, audioBuffer);
        console.log('File saved successfully');
        
        // Verify file exists and get its size
        const stats = await fs.stat(fileName);
        console.log('File size:', stats.size, 'bytes');

        // Return the file path
        const responseData = { 
            success: true,
            fileName: fileName,
            timestamp: timestamp
        };
        console.log('Sending response:', responseData);
        res.json(responseData);
    } catch (error) {
        console.error('Error in /convert:', error);
        res.status(500).json({ 
            error: 'Failed to convert text to speech',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}) as express.RequestHandler;

app.use(express.json());
app.use(express.static('public'));
app.use(limiter);
app.use(router);

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});