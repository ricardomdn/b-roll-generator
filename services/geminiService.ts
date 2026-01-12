import { GoogleGenAI, Type } from "@google/genai";

export interface SegmentResponse {
  text: string;
  search_terms: string[];
}

export const analyzeScript = async (apiKey: string, script: string): Promise<SegmentResponse[]> => {
  if (!apiKey) throw new Error("API Key do Gemini é obrigatória");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Analyze the following video script. 
    Break it down into logical visual segments (scenes). 
    
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
        systemInstruction: "You are a stock footage expert. You generate English search keywords ordered from specific to very broad.",
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