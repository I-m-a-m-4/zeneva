import { NextResponse } from 'next/server';

export const maxDuration = 60; // Allow more time for large files just in case

export async function POST(req: Request) {
  try {
    let formData;
    try {
      formData = await req.formData();
    } catch (e) {
      console.error('FormData parsing failed. Request body might have been too large and truncated by Next.js.', e);
      return NextResponse.json({ error: 'Audio file is too large or corrupted.' }, { status: 413 });
    }
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const groqFormData = new FormData();
    groqFormData.append('file', file);
    groqFormData.append('model', 'whisper-large-v3-turbo');
    groqFormData.append('response_format', 'json');

    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      // Pass the FormData directly
      body: groqFormData as unknown as BodyInit,
    });

    if (!groqRes.ok) {
      const errorData = await groqRes.text();
      console.error('Groq API Error:', errorData);
      return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 });
    }

    const data = await groqRes.json();
    return NextResponse.json({ text: data.text });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
