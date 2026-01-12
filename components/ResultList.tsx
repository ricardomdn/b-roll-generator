import React, { useState, useEffect } from 'react';
import { ScriptSegment } from '../types';

interface ResultListProps {
  segments: ScriptSegment[];
  onUpdateSegment: (id: string, newTerm: string) => Promise<void>;
  onRegenerateSegment: (id: string) => Promise<void>;
}

// Componente individual para gerenciar estado de edição e loading
const ResultCard: React.FC<{ 
  segment: ScriptSegment; 
  index: number; 
  onUpdate: (id: string, term: string) => Promise<void>;
  onRegenerate: (id: string) => Promise<void>;
}> = ({ segment, index, onUpdate, onRegenerate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTerm, setEditTerm] = useState(segment.searchTerm);
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync editTerm with segment.searchTerm if it changes externally (e.g. by AI regeneration)
  useEffect(() => {
    setEditTerm(segment.searchTerm);
  }, [segment.searchTerm]);

  const handleSave = async () => {
    if (!editTerm.trim()) return;
    setIsEditing(false);
    setIsUpdating(true);
    await onUpdate(segment.id, editTerm);
    setIsUpdating(false);
  };

  const handleRegenerateClick = async () => {
    setIsUpdating(true);
    await onRegenerate(segment.id);
    setIsUpdating(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setEditTerm(segment.searchTerm);
      setIsEditing(false);
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-lg transition-all hover:border-emerald-500/50">
      <div className="flex flex-col xl:flex-row h-full">
        {/* Text Section */}
        <div className="p-5 xl:w-2/5 flex flex-col justify-center border-b xl:border-b-0 xl:border-r border-slate-700 bg-slate-800/50 relative">
          
          <div className="mb-2 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
              {index + 1}
              </span>
              <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">Cena</span>
          </div>
          <p className="text-slate-200 text-base leading-relaxed font-medium">
            "{segment.text}"
          </p>
          
          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-slate-500 uppercase font-semibold">Termo de Busca (Prompt)</p>
              
              {/* Actions */}
              <div className="flex gap-1">
                {/* AI Regenerate Button */}
                <button 
                  onClick={handleRegenerateClick}
                  disabled={isUpdating || isEditing}
                  title="Gerar nova sugestão com IA"
                  className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 rounded-md transition-all disabled:opacity-30 group"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isUpdating ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </button>

                {/* Edit Button (Pencil) */}
                {!isEditing && (
                  <button 
                    onClick={() => setIsEditing(true)}
                    disabled={isUpdating}
                    title="Editar manualmente"
                    className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 rounded-md transition-all disabled:opacity-30"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {isEditing ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editTerm}
                  onChange={(e) => setEditTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  className="flex-1 bg-slate-900 border border-emerald-500/50 rounded px-2 py-1 text-sm text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button 
                  onClick={handleSave}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded text-xs font-bold"
                >
                  OK
                </button>
              </div>
            ) : (
              <code className="text-xs text-emerald-400 font-mono bg-slate-900 px-2 py-1 rounded block w-full truncate border border-transparent" title={segment.searchTerm}>
                {segment.searchTerm}
              </code>
            )}
          </div>
        </div>

        {/* Video Section */}
        <div className="xl:w-3/5 bg-black relative flex items-center justify-center min-h-[250px]">
          {isUpdating ? (
             <div className="flex flex-col items-center justify-center text-emerald-500">
                <svg className="animate-spin h-8 w-8 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-xs uppercase tracking-wider font-semibold">Buscando novo vídeo...</span>
             </div>
          ) : segment.videoUrl ? (
            <div className="relative w-full h-full group">
                <video 
                src={segment.videoUrl} 
                controls 
                className="w-full h-full object-contain max-h-[350px]"
                preload="metadata"
                poster={segment.videoUrl.replace('.mp4', '.jpg')} 
              >
                Seu navegador não suporta a tag de vídeo.
              </video>
              
              {/* Video Metadata Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-white text-xs font-medium">Videographer: {segment.videoUser}</p>
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
              <p className="text-slate-600 text-sm mt-1">Tente editar o termo de busca</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ResultList: React.FC<ResultListProps> = ({ segments, onUpdateSegment, onRegenerateSegment }) => {
  if (segments.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">Roteiro Visual Gerado</h3>
        <span className="text-sm text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
          {segments.length} Cenas
        </span>
      </div>
      
      <div className="grid gap-6">
        {segments.map((segment, index) => (
          <ResultCard 
            key={segment.id} 
            segment={segment} 
            index={index} 
            onUpdate={onUpdateSegment} 
            onRegenerate={onRegenerateSegment}
          />
        ))}
      </div>
    </div>
  );
};