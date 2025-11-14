
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { GroundingMetadata } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("Gemini API key not found. Please set the API_KEY environment variable.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const getAIResponse = async (prompt: string, context: string): Promise<{text: string; groundingMetadata: GroundingMetadata | null}> => {
  if (!API_KEY) {
    return {text: "API Key not configured.", groundingMetadata: null};
  }
  
  try {
    const systemInstruction = `You are a helpful civil engineering and scientific assistant. 
      The user is currently using a calculator for: "${context}".
      Provide concise, accurate, and helpful information relevant to field engineers, students, or site supervisors.
      If asked for calculations, explain the concept rather than just giving a number.
      Use Google Search to find up-to-date information or standards when necessary.
      Always format your response using Markdown.`;
      
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction,
            tools: [{googleSearch: {}}],
        }
    });

    const text = response.text;
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata as GroundingMetadata || null;

    return { text, groundingMetadata };
  } catch (error) {
    console.error("Error fetching AI response:", error);
    return { text: "Sorry, I encountered an error. Please try again.", groundingMetadata: null };
  }
};
