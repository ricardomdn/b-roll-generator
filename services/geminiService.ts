import { GoogleGenAI, Type } from "@google/genai";

export interface SegmentResponse {
  text: string;
  search_terms: string[];
}

export const analyzeScript = async (apiKey: string, script: string): Promise<SegmentResponse[]> => {
  if (!apiKey) throw new Error("API Key do Gemini é obrigatória");

  // CRITICAL FIX: Flatten the script to remove paragraph breaks that might cause the model to stop early.
  // This forces the model to treat the input as a single continuous stream of text.
  const cleanScript = script.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Analyze the **ENTIRE** video script provided below.
    
    Script Content:
    """
    ${cleanScript}
    """

    **TASK:**
    Break down the text above into logical visual segments (scenes) from start to finish.

    **PACING RULES (HIGH PRIORITY):**
    1.  **THE HOOK (First 20% of text):** You MUST create **RAPID CUTS** for the beginning. 
        *   **Instruction:** Break the first 3-5 sentences into very short sub-segments (every 4-8 words or per specific action). 
        *   **Goal:** High energy, fast visual changes to grab attention immediately.
        *   *Example:* Instead of one long clip for "Welcome to the world of AI where everything changes", split it into:
            1. "Welcome to the world of AI" (Visual: AI Brain)
            2. "where everything changes" (Visual: Fast timelapse)
    2.  **THE BODY (Remaining text):** Switch to natural pacing. One visual per full sentence or complete thought.
    
    **CRITICAL INSTRUCTIONS:**
    1.  **NO TRUNCATION:** You MUST process every single sentence until the very last word.
    2.  **CONTINUOUS STREAM:** Treat the input as a raw stream. Ignore original formatting/paragraphs.
    3.  **GRANULARITY:** Do not group multiple sentences into one segment unless they are very short.

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
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are a professional video editor specializing in B-Roll. You prioritize fast-paced hooks and complete coverage of the script.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: {
                type: Type.STRING,
                description: "The text segment (Keep short for the first 5 segments)",
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