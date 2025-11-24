import { NextRequest, NextResponse } from 'next/server';
import cheerio from 'cheerio';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FETCH_TIMEOUT_MS = 12000;

const HEADER_SETS: Array<Record<string, string> | (() => Record<string, string>)> = [
  {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  },
  () => ({
    'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${60 + Math.floor(Math.random() * 20)}.0) Gecko/20100101 Firefox/${60 + Math.floor(Math.random() * 20)}.0`,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  }),
  {
    'User-Agent':
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
  },
];

const CTA_KEYWORDS = ['sign up', 'signup', 'get started', 'start free', 'join now', 'try now', 'see pricing', 'buy now', 'learn more', 'start now'];

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    for (const headerSet of HEADER_SETS) {
      const headers = typeof headerSet === 'function' ? headerSet() : headerSet;
      try {
        const response = await fetch(url, {
          headers,
          redirect: 'follow',
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok) {
          continue;
        }

        const buffer = await response.arrayBuffer();
        const decoder = new TextDecoder('utf-8', { fatal: false });
        return decoder.decode(buffer);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          throw err;
        }
      }
    }

    throw new Error('bot_protected');
  } finally {
    clearTimeout(timeout);
  }
}

function cleanHtmlToText(html: string): string {
  let $: cheerio.CheerioAPI;
  try {
    $ = cheerio.load(html);
  } catch {
    return '';
  }

  $('script, style, noscript, svg, path, iframe').remove();
  $('header, nav, footer, aside, menu, .cookie, .gdpr, .consent, .banner, .popup, .modal, .advert, .ad, .ads, .newsletter').remove();

  const allowedSelectors = ['h1', 'h2', 'h3', 'p', 'li', 'section', 'main', 'article', 'div', 'a'];
  const textSet = new Set<string>();

  allowedSelectors.forEach((sel) => {
    $(sel).each((_, el) => {
      const className = ($(el).attr('class') || '').toLowerCase();
      if (el.tagName === 'div' && !(className.includes('hero') || className.includes('content'))) return;

      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (!text) return;
      if (/privacy|cookies?|gdpr|terms|copyright|all rights reserved/i.test(text)) return;

      const lower = text.toLowerCase();
      const wordCount = text.split(/\s+/).length;
      const isCTA = CTA_KEYWORDS.some((kw) => lower.includes(kw));
      if (wordCount < 3 && !isCTA) return;

      textSet.add(text);
    });
  });

  return Array.from(textSet).join(' ').trim();
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const url = (body as { url?: unknown })?.url;
  if (typeof url !== 'string' || !url.trim()) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  if (!isValidUrl(url)) {
    return NextResponse.json({ error: 'URL is invalid. Please enter a full http(s) URL.' }, { status: 400 });
  }

  try {
    const html = await fetchHtml(url);
    const text = cleanHtmlToText(html);

    if (text) {
      return NextResponse.json({ text });
    }

    const $ = cheerio.load(html);
    const title = $('title').first().text().trim();
    const metaDesc = $('meta[name="description"]').attr('content')?.trim();
    const fallback = [title, metaDesc].filter(Boolean).join(' ').trim();

    if (fallback) {
      return NextResponse.json({
        text: fallback,
        warning: 'Body content was empty after cleaning; using title/meta description as fallback.',
      });
    }

    return NextResponse.json(
      { error: 'The page was fetched but no meaningful text was found to analyze.' },
      { status: 400 }
    );
  } catch (err) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    const isBot = err instanceof Error && err.message === 'bot_protected';

    return NextResponse.json(
      {
        error: isBot
          ? 'The page is bot-protected or blocked. Manual paste required.'
          : 'Failed to fetch or parse the provided URL. Please try another page.',
        details: isAbort ? `Request timed out after ${FETCH_TIMEOUT_MS}ms` : err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 400 }
    );
  }
}
