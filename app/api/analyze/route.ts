import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import cheerio from 'cheerio';

function extractVisibleText(html: string): string {
  const $ = cheerio.load(html);

  const exclusionSelectors = [
    'header',
    'nav',
    'footer',
    'aside',
    'script',
    'style',
    'noscript',
    'form',
    'button',
    'svg',
    'path',
    'iframe',
    'a',
    'ul.menu',
    '.newsletter',
    '.cookie',
    '.ad',
    '.advert',
    '.promo',
    '.sidebar',
    '.mobile-menu',
    '.breadcrumbs',
    '.pagination',
  ];

  exclusionSelectors.forEach((selector) => $(selector).remove());
  $('[aria-hidden="true"], [style*="display:none"], [style*="visibility:hidden"]').remove();

  const allowedSelectors = 'h1, h2, h3, p, li, span, strong, section, article, main';
  const ctaKeywords = ['sign up', 'signup', 'get started', 'start free', 'join now', 'try now', 'see pricing', 'buy now', 'learn more', 'start now'];
  const textChunks = new Set<string>();

  $(allowedSelectors).each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (!text) return;

    const lower = text.toLowerCase();
    const wordCount = text.split(/\s+/).length;
    const isCTA = ctaKeywords.some((kw) => lower.includes(kw));
    const isDisclaimer = /privacy|terms|cookie|copyright|all rights reserved/i.test(text);

    if (isDisclaimer) return;
    if (wordCount < 3 && !isCTA) return;

    textChunks.add(text);
  });

  return Array.from(textChunks).join(' ').trim();
}

export async function POST(request: NextRequest) {
  try {
    // Check API key first
    const apiKey = process.env.GROQ_API_KEY;
    
    if (!apiKey || apiKey === 'your_groq_api_key_here') {
      return NextResponse.json(
        { error: 'GROQ_API_KEY is not configured. Please add your real Groq API key to .env.local file and restart the server.' },
        { status: 500 }
      );
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Invalid JSON in request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { text: rawText, url } = body as { text?: unknown; url?: unknown };
    let text = typeof rawText === 'string' ? rawText : '';

    if (!text && typeof url === 'string' && url.trim()) {
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          throw new Error('Unsupported protocol');
        }
      } catch {
        return NextResponse.json(
          { error: 'URL is invalid. Please enter a full http(s) URL.' },
          { status: 400 }
        );
      }

      try {
        const fetchHeaders = {
          'User-Agent': 'Mozilla/5.0 (compatible; LandingPageAnalyzer/1.0; +https://example.com)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        };

        const pageResponse = await fetch(parsedUrl.toString(), {
          headers: fetchHeaders,
          redirect: 'follow',
          cache: 'no-store',
        });

        if (!pageResponse.ok) {
          return NextResponse.json(
            { error: `Failed to fetch URL content (status ${pageResponse.status}).` },
            { status: 400 }
          );
        }

        const html = await pageResponse.text();
        text = extractVisibleText(html);

        if (!text) {
          return NextResponse.json(
            { error: 'Fetched the page but no meaningful text was found to analyze.' },
            { status: 400 }
          );
        }
      } catch (fetchErr) {
        console.error('Failed to fetch or parse URL:', fetchErr);
        return NextResponse.json(
          { 
            error: 'Failed to fetch or parse the provided URL. Please try another page.',
            details: fetchErr instanceof Error ? fetchErr.message : undefined
          },
          { status: 400 }
        );
      }
    }

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required and must be a string' },
        { status: 400 }
      );
    }

    // Initialize Groq client
    let groq;
    try {
      groq = new Groq({
        apiKey: apiKey,
      });
    } catch (initError: unknown) {
      const message = initError instanceof Error ? initError.message : 'Unknown initialization error';
      console.error('Failed to initialize Groq client:', initError);
      return NextResponse.json(
        { 
          error: 'Failed to initialize Groq client',
          details: message
        },
        { status: 500 }
      );
    }

    const systemPrompt = `You are a senior CRO (Conversion Rate Optimization) expert with 15+ years of experience.

Your task: 
Analyze ONLY the true landing page content. 
Ignore all irrelevant elements such as:
- navigation bars
- menus
- footers
- category lists
- blog lists
- pagination
- legal text
- cookie notices
- SEO metadata
- repeating headers
- sidebar widgets
- search boxes
- advertisements
- comments
- user instructions
- interface controls (“login”, “signup”, etc.)

If the input contains full website dump or noisy HTML text, 
EXTRACT ONLY the meaningful landing page content:
- headline
- subheadline
- core value proposition
- features
- hero section text
- CTA
- selling points
- benefit statements

Use strict CRO principles:
clarity, differentiation, friction, CTA strength, value proof, offer structure.

For every critique:
- Quote the weak phrase
- Explain WHY it fails
- Provide a concrete rewrite tied to CRO logic

OUTPUT MUST BE VALID JSON ONLY with this schema:

{
  "score": number,
  "breakdown": {
    "clarity": number,
    "differentiation": number,
    "friction": number,
    "cta_strength": number,
    "value_proof": number,
    "offer_architecture": number
  },
  "critique": ["point 1", "point 2", "point 3", "point 4"],
  "headline_alternatives": ["alt 1", "alt 2"],
  "cta_variants": ["cta 1", "cta 2"],
  "ab_test_ideas": ["idea 1", "idea 2"],
  "summary": "short expert summary"
}

Only return JSON. No extra text.`;

    const userPrompt = `Evaluate the provided landing page text using these CRO pillars: Clarity, Differentiation, Friction, CTA Strength, Value Proof, Offer Architecture.

Return ONLY a valid JSON object with this exact schema. Do not include any text outside the JSON.
{
  "score": number,
  "breakdown": {
    "clarity": number,
    "differentiation": number,
    "friction": number,
    "cta_strength": number,
    "value_proof": number,
    "offer_architecture": number
  },
  "critique": ["point 1", "point 2", "point 3", "point 4"],
  "headline_alternatives": ["headline A", "headline B"],
  "cta_variants": ["cta A", "cta B"],
  "ab_test_ideas": ["idea A", "idea B"],
  "summary": "Short expert summary"
}

Scoring scale → 1 = terrible, 10 = elite. Be harsh. No score inflation.
    
Landing page text:
${text}`;

    // Call Groq API with error handling
    let completion;
    try {
      completion = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: {
          type: 'json_object',
        },
      });
    } catch (groqError: unknown) {
      console.error('Groq API error:', groqError);
      const parseErrorDetails = (err: unknown): {
        status?: number;
        statusCode?: number;
        statusText?: string;
        message?: string;
        code?: string;
        name?: string;
      } => {
        if (!err || typeof err !== 'object') {
          return {};
        }

        const errorObj = err as Record<string, unknown>;

        return {
          status: typeof errorObj.status === 'number' ? errorObj.status : undefined,
          statusCode: typeof errorObj.statusCode === 'number' ? errorObj.statusCode : undefined,
          statusText: typeof errorObj.statusText === 'string' ? errorObj.statusText : undefined,
          message: typeof errorObj.message === 'string' ? errorObj.message : undefined,
          code: typeof errorObj.code === 'string' ? errorObj.code : undefined,
          name: typeof errorObj.name === 'string' ? errorObj.name : undefined,
        };
      };

      const errorDetails = parseErrorDetails(groqError);
      const statusCode = errorDetails.status ?? errorDetails.statusCode;
      console.error('Error details:', errorDetails);
      
      // Handle specific Groq errors
      if (statusCode === 401) {
        return NextResponse.json(
          { 
            error: 'Invalid Groq API key. Please check: 1) API key is correct in .env.local, 2) No extra spaces, 3) Server was restarted after adding the key, 4) API key is from https://console.groq.com/keys',
            details: 'Make sure your Groq API key is valid and you have restarted the dev server after adding it.'
          },
          { status: 500 }
        );
      }
      
      if (statusCode === 429) {
        return NextResponse.json(
          { error: 'Groq API rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { 
          error: 'Failed to communicate with Groq API',
          details: errorDetails.message || 'Unknown error',
          status: statusCode,
          code: errorDetails.code
        },
        { status: 500 }
      );
    }

    const responseContent = completion.choices[0]?.message?.content;

    if (!responseContent) {
      return NextResponse.json(
        { error: 'No response from Groq' },
        { status: 500 }
      );
    }

    // Clean response content (remove markdown code blocks if present)
    let cleanedContent = responseContent.trim();
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }
    cleanedContent = cleanedContent.trim();

    // Parse JSON response with error handling
    let jsonResponse;
    try {
      jsonResponse = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse Groq response:', parseError, cleanedContent);
      return NextResponse.json(
        { 
          error: 'Invalid JSON response from Groq',
          details: 'The AI model did not return valid JSON. Please try again.',
          rawResponse: cleanedContent.substring(0, 200) // First 200 chars for debugging
        },
        { status: 500 }
      );
    }

    // Validate response structure
    if (
      typeof jsonResponse.score !== 'number' ||
      !jsonResponse.breakdown ||
      !Array.isArray(jsonResponse.critique)
    ) {
      return NextResponse.json(
        { error: 'Invalid response format from Groq', response: jsonResponse },
        { status: 500 }
      );
    }

    return NextResponse.json(jsonResponse);
  } catch (error: unknown) {
    console.error('Unexpected error in analyze route:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message
      },
      { status: 500 }
    );
  }
}
