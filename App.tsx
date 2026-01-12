import React, { useState, useRef, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ResultList } from './components/ResultList';
import { analyzeScript } from './services/geminiService';
import { searchPexelsVideo } from './services/pexelsService';
import { ApiKeys, ScriptSegment } from './types';

// Helper delay function to avoid hitting API rate limits
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const App: React.FC = () => {
  // Inicializa o estado verificando o LocalStorage
  const [apiKeys, setApiKeys] = useState<ApiKeys>(() => {
    try {
      const saved = localStorage.getItem('ai_broll_keys');
      return saved ? JSON.parse(saved) : { gemini: '', pexels: '' };
    } catch (e) {
      return { gemini: '', pexels: '' };
    }
  });

  const [script, setScript] = useState('');
  const [segments, setSegments] = useState<ScriptSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Estados para o Modo Cinema (Preview)
  const [showPreview, setShowPreview] = useState(false);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleGenerate = async () => {
    setError(null);
    
    if (!apiKeys.gemini || !apiKeys.pexels) {
      setError("Por favor, insira ambas as chaves API na barra lateral antes de continuar.");
      return;
    }

    if (!script.trim()) {
      setError("Por favor, insira um roteiro para analisar.");
      return;
    }

    setLoading(true);
    setSegments([]);

    try {
      // Step 1: Gemini Analysis
      setLoadingStep('Analisando roteiro com IA (Gemini)...');
      const rawSegments = await analyzeScript(apiKeys.gemini, script);
      
      if (rawSegments.length === 0) {
        throw new Error("A IA não retornou nenhum segmento válido.");
      }

      // Step 2: Pexels Video Search
      setLoadingStep(`Buscando vídeos para ${rawSegments.length} cenas...`);
      
      const segmentPromises = rawSegments.map(async (seg, index) => {
        let videoData = null;
        let usedTerm = seg.search_terms[0]; // Default to first term

        // Tenta encontrar vídeo iterando pelos termos (Específico -> Geral)
        for (const term of seg.search_terms) {
          try {
            // Pequeno delay para evitar Rate Limiting do Pexels (429 Too Many Requests)
            // Especialmente importante quando o termo falha e tenta o próximo rapidamente
            await delay(150); 
            
            const result = await searchPexelsVideo(apiKeys.pexels, term);
            if (result && result.video_files && result.video_files.length > 0) {
              videoData = result;
              usedTerm = term;
              break; // Encontrou! Para o loop.
            }
          } catch (e) {
            console.warn(`Falha ao buscar termo "${term}":`, e);
            // Se for erro de autorização, lança para parar tudo. 
            if (e instanceof Error && e.message.includes('inválida')) {
                throw e; 
            }
            // Se for outro erro (ex: 429 ou 404), continua para o próximo termo
            continue; 
          }
        }
        
        let bestVideoUrl = null;
        if (videoData && videoData.video_files) {
            const hdFile = videoData.video_files.find(f => f.quality === 'hd' && f.width >= 1280);
            const sdFile = videoData.video_files.find(f => f.quality === 'sd');
            
            bestVideoUrl = hdFile ? hdFile.link : (sdFile ? sdFile.link : videoData.video_files[0]?.link);
        }

        return {
          id: `seg-${index}-${Date.now()}`,
          text: seg.text,
          searchTerm: usedTerm, // Mostra o termo que realmente funcionou
          allSearchTerms: seg.search_terms, // Salva todas as opções para uso posterior
          videoUrl: bestVideoUrl,
          videoDuration: videoData?.duration,
          videoUser: videoData?.user?.name,
          videoUserUrl: videoData?.user?.url
        };
      });

      const results = await Promise.all(segmentPromises);
      setSegments(results);

    } catch (err: any) {
      setError(err.message || "Ocorreu um erro desconhecido.");
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  // Função para atualizar um único segmento (Manual ou Shuffle)
  const handleUpdateSegment = async (segmentId: string, newTerm: string) => {
    // Encontra o segmento atual
    const segmentIndex = segments.findIndex(s => s.id === segmentId);
    if (segmentIndex === -1) return;

    try {
      const result = await searchPexelsVideo(apiKeys.pexels, newTerm);
      
      let bestVideoUrl = null;
      let videoData = null;

      if (result && result.video_files && result.video_files.length > 0) {
        videoData = result;
        const hdFile = videoData.video_files.find(f => f.quality === 'hd' && f.width >= 1280);
        const sdFile = videoData.video_files.find(f => f.quality === 'sd');
        bestVideoUrl = hdFile ? hdFile.link : (sdFile ? sdFile.link : videoData.video_files[0]?.link);
      }

      // Atualiza o estado
      setSegments(prev => {
        const newSegments = [...prev];
        newSegments[segmentIndex] = {
          ...newSegments[segmentIndex],
          searchTerm: newTerm,
          videoUrl: bestVideoUrl,
          videoDuration: videoData?.duration,
          videoUser: videoData?.user?.name,
          videoUserUrl: videoData?.user?.url
        };
        return newSegments;
      });

    } catch (error) {
      console.error("Erro ao atualizar segmento:", error);
      // Opcional: Mostrar toast de erro
    }
  };

  // Funções do Player
  const openPreview = () => {
    if (segments.length > 0) {
      setCurrentPreviewIndex(0);
      setShowPreview(true);
    }
  };

  const closePreview = () => {
    setShowPreview(false);
    if (videoRef.current) videoRef.current.pause();
  };

  const handleVideoEnded = () => {
    if (currentPreviewIndex < segments.length - 1) {
      setCurrentPreviewIndex(prev => prev + 1);
    } else {
      // Loop ou parar? Vamos parar e mostrar o botão de replay
    }
  };

  // Efeito para tocar o vídeo quando o índice mudar
  useEffect(() => {
    if (showPreview && videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(e => console.log("Autoplay preventido pelo navegador", e));
    }
  }, [currentPreviewIndex, showPreview]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <Sidebar apiKeys={apiKeys} setApiKeys={setApiKeys} />

      {/* Main Container - Aumentado para max-w-[1600px] para ocupar mais as laterais */}
      <main className="flex-1 lg:ml-80 p-6 md:p-12 w-full transition-all flex flex-col max-w-[1600px] mx-auto">
        
        <div className="flex-grow">
          {/* Header */}
          <header className="mb-12 text-center lg:text-left">
            <div className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-semibold tracking-wider uppercase mb-4">
              AI Video Tools
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
              Organizador de <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">B-Roll</span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl leading-relaxed">
              Transforme seu roteiro em uma linha do tempo visual. A IA detecta as cenas e encontra automaticamente o vídeo de stock perfeito para cada momento.
            </p>
          </header>

          {/* Input Section - Largura total */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl mb-12">
            <label htmlFor="script-input" className="block text-sm font-semibold text-slate-300 mb-3 flex justify-between">
              <span>Roteiro do Vídeo</span>
              <span className="text-slate-500 font-normal text-xs uppercase tracking-wider">Cole seu texto abaixo</span>
            </label>
            <textarea
              id="script-input"
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Ex: O sol nasce sobre a cidade movimentada, iluminando os arranha-céus de vidro. Corta para uma mulher jovem tomando café e sorrindo enquanto olha seu tablet..."
              className="w-full h-48 bg-slate-950 border border-slate-700 rounded-xl p-4 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all resize-y text-base leading-relaxed"
            />
            
            <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500">
                {script.length > 0 && `${script.length} caracteres`}
              </div>
              
              <div className="flex gap-3 w-full md:w-auto">
                {segments.length > 0 && !loading && (
                   <button
                    onClick={openPreview}
                    className="px-6 py-3 rounded-xl font-bold text-white bg-slate-700 hover:bg-slate-600 transition-all flex items-center gap-2 flex-1 md:flex-none justify-center border border-slate-600"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    Pré-visualizar
                  </button>
                )}

                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className={`
                    px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 flex-1 md:flex-none justify-center
                    ${loading 
                      ? 'bg-slate-700 cursor-not-allowed text-slate-400' 
                      : 'bg-emerald-600 hover:bg-emerald-500 hover:shadow-emerald-500/20 active:transform active:scale-95'
                    }
                  `}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processando...
                    </>
                  ) : (
                    <>
                      <span>🎬</span> {segments.length > 0 ? 'Gerar Novamente' : 'Gerar Clipes'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* Feedback Messages */}
          {loading && (
            <div className="mt-8 text-center animate-pulse">
              <p className="text-emerald-400 font-medium">{loadingStep}</p>
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-900/20 border border-red-800 rounded-xl flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="font-bold text-red-500">Erro</h4>
                <p className="text-red-300 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Results - Pass function to update segments */}
          <div className="w-full">
            <ResultList segments={segments} onUpdateSegment={handleUpdateSegment} />
          </div>
        </div>

        {/* Footer with Watermark */}
        <footer className="mt-20 pt-8 border-t border-slate-800/50 text-center pb-4">
          <p className="text-slate-500 text-sm font-medium">
            Desenvolvido por <a href="https://github.com/ricardomdn" target="_blank" rel="noreferrer" className="text-emerald-500 hover:text-emerald-400 transition-colors hover:underline">Ricardão</a>
          </p>
        </footer>

        {/* CINEMA MODE OVERLAY */}
        {showPreview && segments.length > 0 && (
          <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
            {/* Close Button */}
            <button 
              onClick={closePreview}
              className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors z-[110]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Main Video Area */}
            <div className="w-full h-full max-h-[80vh] max-w-7xl relative flex items-center justify-center bg-black">
              {segments[currentPreviewIndex].videoUrl ? (
                <video
                  ref={videoRef}
                  src={segments[currentPreviewIndex].videoUrl!}
                  className="w-full h-full object-contain"
                  controls={false} // Hide default controls for cinematic feel
                  autoPlay
                  onEnded={handleVideoEnded}
                  onClick={(e) => {
                     e.currentTarget.paused ? e.currentTarget.play() : e.currentTarget.pause();
                  }}
                />
              ) : (
                <div className="text-center text-slate-500">
                  <p className="text-xl">Vídeo não disponível para esta cena</p>
                </div>
              )}

              {/* Subtitles Overlay */}
              <div className="absolute bottom-12 left-0 right-0 px-4 text-center">
                <div className="inline-block bg-black/60 backdrop-blur-sm px-6 py-3 rounded-lg">
                  <p className="text-white text-lg md:text-2xl font-medium drop-shadow-md leading-relaxed">
                    {segments[currentPreviewIndex].text}
                  </p>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="w-full max-w-4xl px-8 h-24 flex items-center justify-between">
               <div className="text-slate-400 text-sm font-mono">
                  Cena {currentPreviewIndex + 1} / {segments.length}
               </div>

               <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setCurrentPreviewIndex(Math.max(0, currentPreviewIndex - 1))}
                    disabled={currentPreviewIndex === 0}
                    className="p-2 rounded-full hover:bg-slate-800 disabled:opacity-30 text-white transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
                    </svg>
                  </button>

                  <button 
                     onClick={() => {
                        if (videoRef.current) {
                           videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
                        }
                     }}
                     className="p-3 bg-white text-black rounded-full hover:bg-slate-200 transition-colors"
                  >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                     </svg>
                  </button>

                  <button 
                    onClick={() => setCurrentPreviewIndex(Math.min(segments.length - 1, currentPreviewIndex + 1))}
                    disabled={currentPreviewIndex === segments.length - 1}
                    className="p-2 rounded-full hover:bg-slate-800 disabled:opacity-30 text-white transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M4.555 14.832l-1.588.914a1 1 0 010-1.664l6-4a1 1 0 011.555.832V14l5.445 3.63a1 1 0 010 1.664l-6 4a1 1 0 01-1.555-.832V14.832z" />
                       <path d="M10 6a1 1 0 011.555-.832l6 4a1 1 0 010 1.664l-6 4A1 1 0 0110 14V6z" />
                    </svg>
                  </button>
               </div>
               
               <div className="w-24"></div> {/* Spacer for alignment */}
            </div>

            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-900">
               <div 
                  className="h-full bg-emerald-500 transition-all duration-300" 
                  style={{ width: `${((currentPreviewIndex + 1) / segments.length) * 100}%` }}
               />
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;