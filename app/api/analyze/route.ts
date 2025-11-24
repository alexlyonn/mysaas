import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { StreamingTextResponse, GroqStream } from 'ai';

const MAX_TEXT_LENGTH = 6000;

function createSystemPrompt(targetAudience: string, productType: string): string {
  return `You are "Growth Engine", a world-class Conversion Rate Optimization (CRO) expert AI. Your analysis is sharp, data-driven, and relentlessly focused on maximizing conversions.

  **MISSION CONTEXT:**
  - **Product Type:** ${productType || 'Not specified'}
  - **Target Audience:** ${targetAudience || 'Not specified'}

  **YOUR TASK:**
  Analyze the landing page text provided, keeping the mission context at the forefront of your evaluation. Your feedback must be hyper-personalized to this specific audience and product.

  **OUTPUT FORMAT:**
  You must respond with a valid JSON object strictly following this schema. Do not add any markdown formatting like \`\`\`json. Just return the raw JSON string.
  {
    "score": number (1-10, overall conversion potential),
    "breakdown": {
      "clarity": number (1-10, is the message instantly understandable for the target audience?),
      "differentiation": number (1-10, does it stand out from competitors?),
      "friction": number (1-10, how much resistance or doubt does the copy create?),
      "cta_strength": number (1-10, is the call-to-action compelling and clear?),
      "value_proof": number (1-10, is the value proven with evidence?),
      "offer_architecture": number (1-10, is the offer structured irresistibly?)
    },
    "critique": ["Actionable critique 1 based on context", "Actionable critique 2 based on context"],
    "headline_alternatives": ["Headline alternative tailored to the audience", "Another headline alternative"],
    "cta_variants": ["CTA variant 1 for this product", "CTA variant 2"],
    "ab_test_ideas": ["A/B test idea 1 relevant to the mission", "A/B test idea 2"],
    "summary": "A brutally honest, concise summary of the page's effectiveness for its mission."
  }`;
}

export async function POST(request: NextRequest) {
  try {
    // 1. API Key Kontrolü
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'your_groq_api_key_here') {
      return NextResponse.json(
        { error: 'Groq API anahtarı yapılandırılmamış. Lütfen .env.local dosyanızı kontrol edin.' },
        { status: 503 }
      );
    }

    // 2. Gelen veriyi al
    const body = await request.json();
    const { completion: text, targetAudience, productType } = body; // 'useCompletion' standart olarak 'completion' anahtarını kullanır.

    if (!text || typeof text !== 'string' || text.length < 20) { // Karakter limitini biraz düşürelim
      return NextResponse.json(
        { error: 'Analiz edilecek metin (veya URL) geçerli değil veya çok kısa.' },
        { status: 400 }
      );
    }

    // 3. Groq Başlat
    const groq = new Groq({ apiKey });

    // 4. Dinamik Prompt Oluştur
    const systemPrompt = createSystemPrompt(targetAudience, productType);

    // 4. Yapay Zeka İstegi
    const response = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this text:\n\n${text.substring(0, MAX_TEXT_LENGTH)}` },
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.5,
      max_tokens: 1500,
      stream: true, // Akışı etkinleştir
    });

    // 5. Yanıtı akış olarak istemciye gönder
    const stream = GroqStream(response);
    return new StreamingTextResponse(stream);

  } catch (error: any) {
    console.error('Analiz Hatası:', error);

    // Groq API'sinden gelen spesifik hataları ele alalım
    if (error instanceof Groq.APIError) {
      const status = error.status || 500;
      const message = error.message || 'Groq API hatası oluştu.';
      return NextResponse.json({ error: message }, { status });
    }

    // Diğer beklenmedik hatalar için genel bir yanıt
    const errorMessage = error.message || 'Beklenmedik bir sunucu hatası oluştu.';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
