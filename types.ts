export interface ScriptSegment {
  text: string;
  searchTerm: string;
  allSearchTerms: string[]; // Stores the 3 variations from Gemini
  videoUrl?: string | null;
  videoDuration?: number;
  videoUser?: string;
  videoUserUrl?: string;
  id: string; // unique id for list rendering
}

export interface ApiKeys {
  gemini: string;
  pexels: string;
}

export interface PexelsVideoFile {
  id: number;
  quality: string;
  file_type: string;
  width: number;
  height: number;
  link: string;
}

export interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  duration: number;
  url: string;
  image: string;
  user: {
    id: number;
    name: string;
    url: string;
  };
  video_files: PexelsVideoFile[];
}

export interface PexelsResponse {
  page: number;
  per_page: number;
  videos: PexelsVideo[];
  total_results: number;
}