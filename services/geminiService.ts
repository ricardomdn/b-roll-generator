import { GoogleGenAI, Type } from "@google/genai";

export interface SegmentResponse {
  text: string;
  search_terms: string[];
}

export const analyzeScript = async (apiKey: string, script: string): Promise<SegmentResponse[]> => {
  if (!apiKey) throw new Error("API Key do Gemini é obrigatória");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Analyze the **ENTIRE** video script provided below.
    Break it down completely into logical visual segments (scenes) from start to finish.
    
    **CRITICAL INSTRUCTIONS:**
    1.  **PROCESS EVERYTHING:** You must output segments for the **WHOLE** script. Do not stop until you reach the very last sentence. Do not summarize.
    2.  **IGNORE FORMATTING:** Ignore paragraph breaks or newlines in the input text. Treat the input as a continuous stream of narration. Paragraphs do NOT indicate the end of the script.
    3.  **GRANULARITY:** Every sentence or major clause should have its own visual.
    
    **PACING:**
    1. **HOOK:** Start with 2-3 short, fast-paced segments.
    2. **BODY:** Natural pacing for the rest.

    For each segment, generate **3 VISUAL SEARCH TERMS** for stock footage.
    
    **SEARCH TERM RULES (CRITICAL):**
    1. **ALWAYS IN ENGLISH** (even if script is Portuguese).
    2. **NO SENTENCES.** Use descriptive KEYWORDS.
    3. **NO** "Cinematic shot", "Video of", "4k". Just the subject.

    **HIERARCHY OF TERMS (You must provide 3):**
    1. **Descriptive (The Vibe):** Subject + Action + Mood/Setting (Max 5-6 words). 
       *Example:* "Sad business woman crying rain window"
    2. **Standard (The Subject):** Main Subject + Action (Max 3-4 words).
       *Example:* "Woman crying window"
    3. **Broad (The Safety Net):** Single Noun/Category (1 word). **Must be very broad.**
       *Example:* "Sadness" or "Rain"
    
    *Logic:* If term 1 fails, the system tries term 2. If term 2 fails, term 3 MUST work.

    Script:
    """
    ${script}
    """
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are a stock footage expert. Your goal is to visualize the ENTIRE script provided, regardless of length or formatting. Never truncate the output.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: {
                type: Type.STRING,
                description: "The original text segment",
              },
              search_terms: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of 3 terms: [Descriptive, Standard, Broad]",
              },
            },
            required: ["text", "search_terms"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];
    
    const data = JSON.parse(text) as SegmentResponse[];
    return data;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Falha ao analisar o script com Gemini. Verifique sua API Key e tente novamente.");
  }
};

export const generateAlternativeTerm = async (apiKey: string, originalText: string, currentTerm: string): Promise<string> => {
  if (!apiKey) throw new Error("API Key do Gemini é obrigatória");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    I need a NEW stock footage search term for a video script segment.
    
    Original Script Segment: "${originalText}"
    Current Search Term: "${currentTerm}"
    
    **TASK:**
    Generate a **completely different** English search term that captures the visual essence of the script segment.
    Try a different angle, subject, or mood than the current term.
    
    **RULES:**
    1. English ONLY.
    2. Max 4-5 words.
    3. Keywords only (Subject + Action).
    4. Do not use the exact same words as the current term if possible.
    
    Return ONLY the raw search term string.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are a creative visual assistant. You output single search strings.",
      }
    });

    return response.text?.trim() || currentTerm;
  } catch (error) {
    console.error("Gemini Regenerate Error:", error);
    throw new Error("Falha ao gerar novo termo.");
  }
};