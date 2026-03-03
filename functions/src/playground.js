import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "AIzaSyA07rQulDldq2wD1kQBRnk82D3imqNH0CU" });

const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Hello, how are you?",
});

console.log(result.text); 