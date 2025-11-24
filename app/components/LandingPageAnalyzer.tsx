'use client';

import { useState, useEffect } from 'react';
import { useCompletion } from 'ai/react';
import AnalysisBreakdownChart from './AnalysisBreakdownChart';

// Analiz sonucunun tip tanımı
interface AnalysisResult {
  score: number;
  breakdown: {
    clarity: number;
    differentiation: number;
    friction: number;
    cta_strength: number;
    value_proof: number;
    offer_architecture: number;
  };
  critique: string[];
  headline_alternatives: string[];
  cta_variants: string[];
  ab_test_ideas: string[];
  summary: string;
}

// Geçmiş kaydının tip tanımı
interface AnalysisHistoryItem {
  id: number;
  timestamp: string;
  text: string;
  targetAudience: string;
  productType: string;
  result: AnalysisResult;
}

export default function LandingPageAnalyzer() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  // Yeni state'ler "Görev Bağlamı" için
  const [targetAudience, setTargetAudience] = useState('');
  const [productType, setProductType] = useState('');

  const {
    setInput, // input'u programatik olarak ayarlamak için
    completion,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
  } = useCompletion({
    api: '/api/analyze',
    // API'ye ek bağlam verilerini gönder
    body: {
      targetAudience,
      productType,
    },
    onFinish: (_, finalCompletion) => {
      try {
        const result = JSON.parse(finalCompletion);
        setAnalysisResult(result); // Sonucu state'e ata

        // Yeni geçmiş kaydını oluştur ve state'e ekle
        const newHistoryItem: AnalysisHistoryItem = {
          id: Date.now(),
          timestamp: new Date().toLocaleString('tr-TR'),
          text: input, // Analiz edilen metin
          targetAudience: targetAudience, // Bağlamı kaydet
          productType: productType,       // Bağlamı kaydet
          result: result,
        };
        setHistory(prev => [newHistoryItem, ...prev]);
      } catch (e) {
        console.error('Failed to parse final completion:', e);
        setAnalysisResult(null);
      }
    },
    onError: (err) => {
      console.error('Completion error:', err);
    }
  });

  // Component yüklendiğinde localStorage'dan geçmişi yükle
  useEffect(() => {
    const savedHistory = localStorage.getItem('analysisHistory');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  // history state'i her değiştiğinde localStorage'ı güncelle
  useEffect(() => {
    // Geçmişte kayıt varsa kaydet, yoksa sil.
    if (history.length > 0) {
      localStorage.setItem('analysisHistory', JSON.stringify(history));
    } else {
      localStorage.removeItem('analysisHistory');
    }
  }, [history]);

  // Geçmişten bir analizi yükle
  const handleLoadHistory = (item: AnalysisHistoryItem) => {
    setInput(item.text);
    setTargetAudience(item.targetAudience);
    setProductType(item.productType);
    setAnalysisResult(item.result);
  };

  // Bir geçmiş kaydını sil
  const handleDeleteHistory = (id: number) => {
    const updatedHistory = history.filter(item => item.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem('analysisHistory', JSON.stringify(updatedHistory));
  };

  return (
    <div className="relative max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Geçmiş Panelini Açma Butonu */}
      <button onClick={() => setIsHistoryPanelOpen(true)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white bg-gray-800/50 rounded-full transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg></button>
      <div className="max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Otonom Büyüme Motoru</h1>
        <p className="text-sm text-gray-400 mt-1">
          URL'inizi ve görevinizi belirtin. Gerisini yapay zekaya bırakın.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="mb-8">
        {/* Görev Bağlamı Alanları */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input
            type="text"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            placeholder="Hedef Kitle (örn: Startup Kurucuları)"
            className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            disabled={isLoading}
          />
          <input
            type="text"
            value={productType}
            onChange={(e) => setProductType(e.target.value)}
            placeholder="Ürün Tipi (örn: B2B SaaS)"
            className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            disabled={isLoading}
          />
        </div>
        <input
            type="text" // textarea'dan input'a geçiş
            value={input}
            onChange={handleInputChange}
            placeholder="Analiz edilecek URL'i veya metni buraya yapıştırın..."
            className="w-full p-4 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            disabled={isLoading}
          />
        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-4 px-4 py-3 flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-semibold transition-all duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed transform hover:scale-105 disabled:scale-100"
        >
          {isLoading ? (
            <><svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> <span>ANALİZ EDİLİYOR...</span></>
          ) : (
            <><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> <span>ANALİZİ BAŞLAT</span></>
          )}
        </button>
      </form>

      {error && (
        <div className="p-4 mb-8 bg-red-900/50 border border-red-700 text-red-300 rounded-lg">
          <p className="font-bold">Bir hata oluştu:</p>
          <pre className="whitespace-pre-wrap text-sm mt-2">{error.message}</pre>
        </div>
      )}

      {/* Akış sırasında ham metni göster */}
      {isLoading && completion && (
        <div className="p-6 bg-gray-800 border border-gray-700 rounded-lg">
          <h3 className="font-semibold text-lg text-white mb-2">Analiz Akışı:</h3>
          <p className="text-gray-300 whitespace-pre-wrap">{completion}</p>
        </div>
      )}

      {/* Akış bittiğinde yapılandırılmış sonucu göster */}
      {analysisResult && !isLoading && (
        <div className="space-y-6">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white">Analiz Sonucu (Puan: <span className="text-indigo-400">{analysisResult.score}/10</span>)</h2>
            <p className="text-gray-400 mt-2">{analysisResult.summary}</p>
          </div>

          {/* Puan Dağılımı Grafiği */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Puan Dağılımı</h3>
            <AnalysisBreakdownChart data={analysisResult.breakdown} />
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Eleştiriler</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-300">
              {analysisResult.critique.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Başlık Alternatifleri</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                {analysisResult.headline_alternatives.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4">A/B Test Fikirleri</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                {analysisResult.ab_test_ideas.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Geçmiş Analizler Paneli (Slide-over) */}
      <div className={`fixed inset-y-0 right-0 w-96 bg-gray-800 border-l border-gray-700 shadow-xl transform transition-transform duration-300 ease-in-out ${isHistoryPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Geçmiş Analizler</h2>
            <div className="flex items-center gap-2">
              {history.length > 0 && (
                <button onClick={() => { setHistory([]); localStorage.removeItem('analysisHistory'); }} className="text-sm text-indigo-400 hover:text-indigo-300">
                  Tümünü Temizle
                </button>
              )}
              <button onClick={() => setIsHistoryPanelOpen(false)} className="p-1 text-gray-400 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
          </div>
          {history.length > 0 ? (
            <ul className="space-y-3 flex-1 overflow-y-auto pr-2">
              {history.map(item => (
                <li key={item.id} className="bg-gray-900 p-3 rounded-lg border border-gray-700 hover:border-indigo-500 transition-colors group">
                  <div className="flex justify-between items-start">
                    <button onClick={() => { handleLoadHistory(item); setIsHistoryPanelOpen(false); }} className="text-left flex-1">
                      <p className="text-sm text-gray-300 truncate">{item.text}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.timestamp}</p>
                    </button>
                    <button onClick={() => handleDeleteHistory(item.id)} className="ml-2 p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4 flex-1 flex items-center justify-center">Henüz analiz yapılmadı.</p>
          )}
        </div>
      </div>
    </div>
  );
}