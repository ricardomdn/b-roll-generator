import React, { useState } from 'react';
import { ApiKeys } from '../types';

interface SidebarProps {
  apiKeys: ApiKeys;
  setApiKeys: (keys: ApiKeys) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ apiKeys, setApiKeys }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Helper to update specific key
  const handleChange = (key: keyof ApiKeys, value: string) => {
    setApiKeys({ ...apiKeys, [key]: value });
  };

  return (
    <>
      {/* Mobile Toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 text-white rounded-md shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar Container */}
      <div className={`
        fixed top-0 left-0 h-full w-80 bg-slate-900 border-r border-slate-700 p-6 z-40 transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 overflow-y-auto
      `}>
        <h2 className="text-xl font-bold text-emerald-400 mb-6 flex items-center gap-2">
          <span className="text-2xl">⚙️</span> Configuração
        </h2>

        <div className="space-y-6">
          {/* Gemini Key */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Google Gemini API Key
            </label>
            <input
              type="password"
              value={apiKeys.gemini}
              onChange={(e) => handleChange('gemini', e.target.value)}
              placeholder="Cole sua Gemini key aqui"
              className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
            <p className="text-xs text-slate-500 mt-1">
              Necessário para análise do script. <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-emerald-500 hover:underline">Obter chave</a>
            </p>
          </div>

          {/* Pexels Key */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Pexels API Key
            </label>
            <input
              type="password"
              value={apiKeys.pexels}
              onChange={(e) => handleChange('pexels', e.target.value)}
              placeholder="Cole sua Pexels key aqui"
              className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
            <p className="text-xs text-slate-500 mt-1">
              Necessário para buscar vídeos. <a href="https://www.pexels.com/api/key/" target="_blank" rel="noreferrer" className="text-emerald-500 hover:underline">Obter chave</a>
            </p>
          </div>

          <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-md">
            <p className="text-xs text-yellow-500 flex items-start gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Suas chaves são usadas apenas no navegador e não são salvas em nenhum servidor.</span>
            </p>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-700 text-slate-500 text-xs text-center">
          <p>Organizador Automático de B-Roll</p>
          <p className="mt-2">Versão 1.0.0</p>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};