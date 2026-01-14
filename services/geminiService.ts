import { GoogleGenAI, Type } from "@google/genai";

export interface SegmentResponse {
  text: string;
  search_terms: string[];
}

export const analyzeScript = async (apiKey: string, script: string): Promise<SegmentResponse[]> => {
  if (!apiKey) throw new Error("API Key do Gemini é obrigatória");

  // V1.2.1 LOGIC: Flatten the script to remove user formatting. 
  // We want the AI to dictate the pacing, not the paragraph breaks.
  const cleanScript = script.replace(/\n/g, " ").replace(/\s+/g, " ").trim();

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Analyze the following video script and segment it into visual scenes for stock footage.
    
    SCRIPT:
    "${cleanScript}"

    **YOUR TASK:**
    Break this script into video segments based on VISUAL FLOW and PACING.

    **PACING RULES (The "Director's Cut"):**
    1.  **The Hook (Start):** The first 10-15 seconds of a video are crucial. Make the first 2-3 segments SHORT and PUNCHY (approx 1 sentence or phrase each) to grab attention.
    2.  **The Body:** Afterwards, balance the pacing. Don't make clips too long. If a sentence is complex, split it.
    3.  **Visual Change:** Start a new segment whenever the *visual idea* changes, even if it's mid-sentence.

    **SEARCH TERM RULES:**
    1.  For each segment, provide 3 DISTINCT search terms for Pexels/Stock Footage.
    2.  **Term 1 (Descriptive):** Literal description (e.g., "Man typing on laptop in dark room").
    3.  **Term 2 (Thematic):** The abstract concept (e.g., "Cybersecurity", "Hacker", "Focus").
    4.  **Term 3 (Broad):** A wider, safe bet (e.g., "Technology", "Computer").
    5.  **English Only:** Search terms must be in English.

    Return the result as a JSON array.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are a professional Video Editor and B-Roll specialist. You ignore line breaks and focus on the story flow.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: {
                type: Type.STRING,
                description: "The spoken text/narration for this segment",
              },
              search_terms: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of 3 search terms: [Descriptive, Thematic, Broad]",
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