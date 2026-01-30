import { PexelsVideo } from "../types";

export const searchEnvatoVideo = async (apiKey: string, query: string): Promise<PexelsVideo | null> => {
  if (!apiKey) throw new Error("API Key do Envato é obrigatória");

  // Using Envato Market API to search VideoHive
  const url = `https://api.envato.com/v1/discovery/search/search/item?site=videohive.net&term=${encodeURIComponent(query)}&page_size=1`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("Chave API do Envato inválida.");
      }
      throw new Error(`Erro na API do Envato: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.matches && data.matches.length > 0) {
      const item = data.matches[0];
      
      // Extract preview URL. Envato structure is nested.
      // Usually: previews -> icon_with_video_preview -> video_url or similar
      // or we look for live_preview_url if available.
      
      let previewVideoUrl = "";
      if (item.previews && item.previews.icon_with_video_preview && item.previews.icon_with_video_preview.video_url) {
          previewVideoUrl = item.previews.icon_with_video_preview.video_url;
      } else if (item.previews && item.previews.live_site && item.previews.live_site.url) {
          // Sometimes live_site is the only option, but it might be an HTML page, not mp4.
          // We prefer specific video previews.
          // Fallback to null if no specific video file found in standard preview slot.
      }

      if (!previewVideoUrl) return null;

      // Normalize to PexelsVideo structure for compatibility
      return {
        id: item.id,
        width: 1920, // Assumption/Placeholder
        height: 1080, // Assumption/Placeholder
        duration: 0, // Envato search doesn't always return duration
        url: item.url, // Link to the item page
        image: item.previews?.landscape_preview?.landscape_url || "",
        user: {
          id: 0,
          name: item.author_username,
          url: item.author_url
        },
        video_files: [
            {
                id: item.id,
                quality: 'hd', // Preview quality
                file_type: 'video/mp4',
                width: 600, // Previews are usually smaller
                height: 338,
                link: previewVideoUrl
            }
        ]
      };
    }
    return null;
  } catch (error) {
    console.error("Envato API Error:", error);
    return null;
  }
};