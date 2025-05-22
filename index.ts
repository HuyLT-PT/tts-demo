import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import wav from 'wav';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const models = ['gemini-2.5-pro-preview-tts','gemini-2.5-flash-preview-tts']

async function saveWaveFile(
    filename:string,
    pcmData: any,
    channels = 1,
    rate = 24000,
    sampleWidth = 2,
 ) {
    return new Promise((resolve, reject) => {
       const writer = new wav.FileWriter(filename, {
             channels,
             sampleRate: rate,
             bitDepth: sampleWidth * 8,
       });
 
       writer.on('finish', resolve);
       writer.on('error', reject);
 
       writer.write(pcmData);
       writer.end();
    });
 }

async function main() {
    const randomModel = models[Math.floor(Math.random() * models.length)];
   try {
      
      const response = await ai.models.generateContent({
         model: randomModel,
         contents: [{ parts: [{ text: 'Say cheerfully: Have a wonderful day!' }] }],
         config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
                 voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' },
                 },
              },
        },
      });
      
     const data  = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
     if(data){
         const audioBuffer = Buffer.from(data, 'base64');
         const fileName = 'out.wav';
         await saveWaveFile(fileName, audioBuffer);
     }
     
      console.log("🔊 Gemini success:\n");
   } catch (error) {
      console.log("🔊 Gemini error:\n", error);
   }
   }

main();