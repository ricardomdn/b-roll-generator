import React from 'react';
import { ScriptSegment } from '../types';

interface ResultListProps {
  segments: ScriptSegment[];
}

export const ResultList: React.FC<ResultListProps> = ({ segments }) => {
  if (segments.length === 0) return null;

  return (
    <div className="space-y-8 mt-10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-bold text-white">Roteiro Visual Gerado</h3>
        <span className="text-sm text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
          {segments.length} Cenas
        </span>
      </div>
      
      <div className="grid gap-6">
        {segments.map((segment, index) => (
          <div 
            key={segment.id} 
            className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-lg transition-all hover:border-emerald-500/50"
          >
            <div className="flex flex-col md:flex-row h-full">
              {/* Text Section */}
              <div className="p-6 md:w-1/3 flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-700 bg-slate-800/50">
                <div className="mb-2 flex items-center gap-2">
                   <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                    {index + 1}
                   </span>
                   <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">Cena</span>
                </div>
                <p className="text-slate-200 text-lg leading-relaxed font-medium">
                  "{segment.text}"
                </p>
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Termo de Busca (Prompt)</p>
                  <code className="text-sm text-emerald-400 font-mono bg-slate-900 px-2 py-1 rounded block w-full truncate">
                    {segment.searchTerm}
                  </code>
                </div>
              </div>

              {/* Video Section */}
              <div className="md:w-2/3 bg-black relative flex items-center justify-center min-h-[300px]">
                {segment.videoUrl ? (
                  <div className="relative w-full h-full group">
                     <video 
                      src={segment.videoUrl} 
                      controls 
                      className="w-full h-full object-contain max-h-[400px]"
                      preload="metadata"
                      poster={segment.videoUrl.replace('.mp4', '.jpg')} // Pexels usually has standard naming, but this is a rough fallback
                    >
                      Seu navegador não suporta a tag de vídeo.
                    </video>
                    
                    {/* Video Metadata Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-white text-sm font-medium">Videographer: {segment.videoUser}</p>
                          <p className="text-slate-300 text-xs">Pexels Video ID: {segment.id.split('-')[1]}</p>
                        </div>
                        <a 
                          href={segment.videoUrl} 
                          download 
                          target="_blank"
                          rel="noreferrer"
                          className="pointer-events-auto bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-md transition-colors flex items-center gap-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-8 flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-slate-400 font-medium">Nenhum vídeo encontrado</p>
                    <p className="text-slate-600 text-sm mt-1">Tente ajustar o termo de busca manualmente</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
