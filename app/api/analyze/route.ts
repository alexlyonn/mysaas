import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(request: NextRequest) {
  try {
    // 1. API Key Kontrolü
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API Key eksik. Lütfen .env.local dosyasına GROQ_API_KEY ekleyin.' },
        { status: 500 }
      );
    }

    // 2. Gelen veriyi al
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string' || text.length < 50) {
      return NextResponse.json(
        { error: 'Analiz edilecek metin çok kısa veya bulunamadı.' },
        { status: 400 }
      );
    }

    // 3. Groq Başlat
    const groq = new Groq({ apiKey });

    // 4. Yapay Zeka İstegi
    const systemPrompt = `You are a Conversion Rate Optimization (CRO) expert. 
    Analyze the landing page text provided.
    You must response with a valid JSON object strictly following this schema:
    {
      "score": number (1-10),
      "breakdown": {
        "clarity": number (1-10),
        "differentiation": number (1-10),
        "friction": number (1-10),
        "cta_strength": number (1-10),
        "value_proof": number (1-10),
        "offer_architecture": number (1-10)
      },
      "critique": ["critique 1", "critique 2", "critique 3"],
      "headline_alternatives": ["alt 1", "alt 2"],
      "cta_variants": ["cta 1", "cta 2"],
      "ab_test_ideas": ["idea 1", "idea 2"],
      "summary": "short summary string"
    }
    Do not add any markdown formatting like \`\`\`json. Just return the raw JSON string.`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this text:\n\n${text.substring(0, 6000)}` }, // Çok uzun metinleri kırpıyoruz
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.5,
      response_format: { type: 'json_object' }, // JSON garantisi
    });

    const responseContent = completion.choices[0]?.message?.content;

    if (!responseContent) {
      throw new Error('Yapay zeka boş yanıt döndürdü.');
    }

    // 5. Yanıtı Parse Et
    const jsonResponse = JSON.parse(responseContent);

    return NextResponse.json(jsonResponse);

  } catch (error: any) {
    console.error('Analiz Hatası:', error);
    return NextResponse.json(
      { error: error.message || 'Sunucu hatası oluştu.' },
      { status: 500 }
    );
  }
}
