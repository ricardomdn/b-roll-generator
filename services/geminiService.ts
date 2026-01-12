import { GoogleGenAI, Type } from "@google/genai";

interface SegmentResponse {
  text: string;
  search_term: string;
}

export const analyzeScript = async (apiKey: string, script: string): Promise<SegmentResponse[]> => {
  if (!apiKey) throw new Error("API Key do Gemini é obrigatória");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Analyze the following video script. 
    Break it down into logical visual segments (scenes). 
    
    **CRITICAL INSTRUCTION FOR PACING:**
    1. **THE HOOK (Beginning):** You MUST break the start of the script (first 2-3 sentences) into very short, fast-paced segments (e.g., 3-5 words each). This creates a high-energy "hook" to grab attention.
    2. **THE BODY:** The rest of the script can have standard, natural pacing based on the narrative flow.

    For each segment, provide the original text (in its original language) and generate a concise, high-quality VISUAL SEARCH TERM in English (e.g., 'cinematic city sunset', 'happy business woman', 'drone shot forest').
    
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
        systemInstruction: "You are a professional video editor specializing in high-retention viral content. You understand the importance of a fast-paced hook.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: {
                type: Type.STRING,
                description: "The original text segment from the script",
              },
              search_term: {
                type: Type.STRING,
                description: "A concise visual search term in English for stock footage",
              },
            },
            required: ["text", "search_term"],
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