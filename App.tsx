import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ResultList } from './components/ResultList';
import { analyzeScript } from './services/geminiService';
import { searchPexelsVideo } from './services/pexelsService';
import { ApiKeys, ScriptSegment } from './types';

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
        const videoData = await searchPexelsVideo(apiKeys.pexels, seg.search_term);
        
        let bestVideoUrl = null;
        if (videoData && videoData.video_files) {
            const hdFile = videoData.video_files.find(f => f.quality === 'hd' && f.width >= 1280);
            const sdFile = videoData.video_files.find(f => f.quality === 'sd');
            
            bestVideoUrl = hdFile ? hdFile.link : (sdFile ? sdFile.link : videoData.video_files[0]?.link);
        }

        return {
          id: `seg-${index}-${Date.now()}`,
          text: seg.text,
          searchTerm: seg.search_term,
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <Sidebar apiKeys={apiKeys} setApiKeys={setApiKeys} />

      <main className="flex-1 lg:ml-80 p-6 md:p-12 max-w-6xl mx-auto w-full transition-all">
        
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

        {/* Input Section */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl">
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
            
            <button
              onClick={handleGenerate}
              disabled={loading}
              className={`
                px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 w-full md:w-auto justify-center
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
                  <span>🎬</span> Gerar Clipes
                </>
              )}
            </button>
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

        {/* Results */}
        <ResultList segments={segments} />

      </main>
    </div>
  );
};

export default App;