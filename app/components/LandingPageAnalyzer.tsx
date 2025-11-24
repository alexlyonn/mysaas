'use client';

import React, { useState } from 'react';

type AnalyzeResponse = {
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
};

export default function LandingPageAnalyzer() {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFetchContent = async () => {
    if (!url.trim()) {
      setError('Please enter a URL to fetch content');
      return;
    }

    setIsFetching(true);
    setError(null);

    try {
      const response = await fetch('/api/fetch-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch content');
      }

      setText(data.text || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch content');
    } finally {
      setIsFetching(false);
    }
  };

  const handleAnalyze = async () => {
    if (!text.trim() && !url.trim()) {
      setError('Please enter text or a URL to analyze');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, url }),
      });

      const data = await response.json();

      if (!response.ok) {
        const message =
          (data && (data.error as string)) ||
          'Failed to analyze landing page. Please check your API key and try again.';
        throw new Error(message);
      }

      setResult(data as AnalyzeResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-8">
      <div className="bg-gray-800 rounded-2xl p-8 shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-white">Analyze Your Landing Page</h2>
        
        <div className="mb-6">
          <label htmlFor="landing-page-url" className="block text-sm font-medium text-gray-300 mb-2">
            Landing Page URL (Optional)
          </label>
          <div className="flex gap-2">
            <input
              id="landing-page-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={isLoading || isFetching}
            />
            <button
              onClick={handleFetchContent}
              disabled={isLoading || isFetching}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 whitespace-nowrap"
            >
              {isFetching ? 'Fetching...' : 'Fetch Content'}
            </button>
          </div>
        </div>

        <div className="mb-6">
          <label htmlFor="landing-page-text" className="block text-sm font-medium text-gray-300 mb-2">
            Landing Page Text
          </label>
          <textarea
            id="landing-page-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your landing page content here..."
            className="w-full h-48 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            disabled={isLoading}
          />
        </div>

        <button
          onClick={handleAnalyze}
          disabled={isLoading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800"
        >
          {isLoading ? 'Analyzing...' : 'Analyze'}
        </button>

        {error && (
          <div className="mt-6 p-4 bg-red-900/30 border border-red-700 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-6 space-y-4">
            <div
              className={`bg-gray-900 rounded-lg p-6 border ${
                result.score >= 7
                  ? 'border-green-500/50'
                  : result.score < 5
                  ? 'border-red-500/50'
                  : 'border-yellow-500/50'
              }`}
            >
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-5xl font-bold ${
                      result.score >= 7
                        ? 'text-green-400'
                        : result.score < 5
                        ? 'text-red-400'
                        : 'text-yellow-400'
                    }`}
                  >
                    {result.score.toFixed(1)}
                  </span>
                  <span className="text-2xl text-gray-400">/ 10</span>
                </div>
                <span className="text-gray-400 text-sm">Overall Score</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                {Object.entries(result.breakdown).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-gray-300">
                    <span className="capitalize">{key.replace('_', ' ')}</span>
                    <span className="font-semibold">{value.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>

            {result.summary && (
              <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-3">Summary</h3>
                <p className="text-gray-300">{result.summary}</p>
              </div>
            )}

            {result.headline_alternatives?.length > 0 && (
              <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-3">Headline Alternatives</h3>
                <ul className="space-y-2">
                  {result.headline_alternatives.map((headline, index) => (
                    <li key={index} className="text-gray-300">
                      {headline}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.cta_variants?.length > 0 && (
              <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-3">CTA Variants</h3>
                <ul className="space-y-2">
                  {result.cta_variants.map((cta, index) => (
                    <li key={index} className="text-gray-300">
                      {cta}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.ab_test_ideas?.length > 0 && (
              <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-300 mb-2">A/B Test Ideas</h3>
                <ul className="space-y-2">
                  {result.ab_test_ideas.map((idea, index) => (
                    <li key={index} className="text-blue-200">
                      {idea}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.critique?.length > 0 && (
              <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-3">Critiques & Recommendations</h3>
                <ul className="space-y-3">
                  {result.critique.map((critique, index) => (
                    <li key={index} className="text-gray-300 flex items-start">
                      <span className="text-indigo-400 mr-2">•</span>
                      <span>{critique}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
