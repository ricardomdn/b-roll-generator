import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ResultList } from './components/ResultList';
import { analyzeScript, generateAlternativeTerm } from './services/geminiService';
import { searchPexelsVideo } from './services/pexelsService';
import { ApiKeys, ScriptSegment } from './types';
import JSZip from 'jszip';
import saveAs from 'file-saver';

// Helper delay function to avoid hitting API rate limits
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const PLACEHOLDER_TEXT = `Ex: Você já sentiu que o tempo está passando rápido demais? A vida na cidade grande nos consome. O trânsito caótico, as luzes artificiais e o barulho constante nos deixam exaustos. Precisamos de uma pausa. Mas imagine um lugar onde o relógio para. Um refúgio onde o único som é o vento nas árvores. Conecte-se com a natureza. Respire ar puro nas montanhas e redescubra sua paz interior. Sua próxima aventura começa agora.`;

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
  
  // Estados de Download
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });
  const [isZipping, setIsZipping] = useState(false);

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

  // Função para atualizar um único segmento (Manual)
  const handleUpdateSegment = async (segmentId: string, newTerm: string) => {
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
    }
  };

  // Função para regenerar um segmento com IA
  const handleRegenerateSegment = async (segmentId: string) => {
    const segmentIndex = segments.findIndex(s => s.id === segmentId);
    if (segmentIndex === -1) return;
    
    const segment = segments[segmentIndex];

    try {
      // 1. Gerar novo termo com Gemini
      const newTerm = await generateAlternativeTerm(apiKeys.gemini, segment.text, segment.searchTerm);

      // 2. Buscar no Pexels com o novo termo
      const result = await searchPexelsVideo(apiKeys.pexels, newTerm);
      
      let bestVideoUrl = null;
      let videoData = null;

      if (result && result.video_files && result.video_files.length > 0) {
        videoData = result;
        const hdFile = videoData.video_files.find(f => f.quality === 'hd' && f.width >= 1280);
        const sdFile = videoData.video_files.find(f => f.quality === 'sd');
        bestVideoUrl = hdFile ? hdFile.link : (sdFile ? sdFile.link : videoData.video_files[0]?.link);
      }

      // 3. Atualizar Estado
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
       console.error("Erro ao regenerar segmento:", error);
       // Poderia setar um erro toast aqui
    }
  };

  // Função para baixar todos os vídeos em ZIP (Paralelizado)
  const handleDownloadAll = async () => {
    const videosToDownload = segments.filter(s => s.videoUrl);
    if (videosToDownload.length === 0) return;

    setDownloading(true);
    setIsZipping(false);
    setDownloadProgress({ current: 0, total: videosToDownload.length });
    
    const zip = new JSZip();
    const folder = zip.folder("b-roll-videos");

    try {
      // Cria um array de Promises para baixar em paralelo
      const downloadPromises = videosToDownload.map(async (segment, index) => {
        if (!segment.videoUrl) return null;

        try {
          const response = await fetch(segment.videoUrl);
          if (!response.ok) throw new Error(`Falha no download`);
          const blob = await response.blob();

          // Atualiza contador
          setDownloadProgress(prev => ({
            ...prev,
            current: prev.current + 1
          }));

          const safeFilename = segment.searchTerm.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          const fileName = `cena_${(index + 1).toString().padStart(2, '0')}_${safeFilename}.mp4`;

          return { fileName, blob };
        } catch (e) {
          console.error(`Erro ao baixar video ${index}:`, e);
          return null;
        }
      });

      // Aguarda todos os downloads
      const files = await Promise.all(downloadPromises);

      // Adiciona ao ZIP
      files.forEach(file => {
        if (file && folder) {
          folder.file(file.fileName, file.blob);
        }
      });

      if (files.filter(f => f !== null).length > 0) {
        setIsZipping(true); // Muda o texto para "Compactando..."
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, "b-roll-pack.zip");
      }

    } catch (err) {
      console.error("Erro ao gerar ZIP:", err);
      setError("Falha ao criar arquivo ZIP. Alguns vídeos podem ter bloqueio de download.");
    } finally {
      setDownloading(false);
      setIsZipping(false);
      setDownloadProgress({ current: 0, total: 0 });
    }
  };

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
              placeholder={PLACEHOLDER_TEXT}
              className="w-full h-56 bg-slate-950 border border-slate-700 rounded-xl p-4 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all resize-y text-base leading-relaxed"
            />
            
            <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500">
                {script.length > 0 && `${script.length} caracteres`}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                {/* Botões de Ação Condicionais */}
                {segments.length > 0 && !loading && (
                   <>
                      <button
                        onClick={handleDownloadAll}
                        disabled={downloading}
                        className={`
                          px-5 py-3 rounded-xl font-bold text-white transition-all flex items-center gap-2 justify-center border border-slate-600 min-w-[160px]
                          ${downloading ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-600'}
                        `}
                      >
                         {downloading ? (
                             <div className="flex items-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>
                                  {isZipping 
                                    ? 'Compactando...' 
                                    : `${downloadProgress.current}/${downloadProgress.total}`}
                                </span>
                             </div>
                         ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              <span className="flex items-center gap-1">
                                Baixar Tudo
                                <span className="text-xs opacity-60 font-medium tracking-wide">(Lento)</span>
                              </span>
                            </>
                         )}
                      </button>
                   </>
                )}

                {/* Botão Principal Gerar */}
                <button
                  onClick={handleGenerate}
                  disabled={loading || downloading}
                  className={`
                    px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 justify-center
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
            <ResultList 
                segments={segments} 
                onUpdateSegment={handleUpdateSegment} 
                onRegenerateSegment={handleRegenerateSegment}
            />
          </div>
        </div>

        {/* Footer with Watermark */}
        <footer className="mt-20 pt-8 border-t border-slate-800/50 text-center pb-4">
          <p className="text-slate-500 text-sm font-medium">
            Desenvolvido por <a href="https://github.com/ricardomdn" target="_blank" rel="noreferrer" className="text-emerald-500 hover:text-emerald-400 transition-colors hover:underline">Ricardão</a>
          </p>
        </footer>

      </main>
    </div>
  );
};

export default App;