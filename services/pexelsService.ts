import { PexelsResponse, PexelsVideo } from "../types";

export const searchPexelsVideo = async (apiKey: string, query: string): Promise<PexelsVideo | null> => {
  if (!apiKey) throw new Error("API Key do Pexels é obrigatória");

  const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: apiKey,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Chave API do Pexels inválida.");
      }
      throw new Error(`Erro na API do Pexels: ${response.statusText}`);
    }

    const data: PexelsResponse = await response.json();
    
    if (data.videos && data.videos.length > 0) {
      return data.videos[0];
    }
    return null;
  } catch (error) {
    console.error("Pexels API Error:", error);
    // Don't throw here to allow partial results (some videos found, some not)
    return null;
  }
};
