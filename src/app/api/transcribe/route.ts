import { NextResponse } from 'next/server';
import { adminAuth } from '@/firebase/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow more time for large files just in case

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // Groq's Whisper upload limit

export async function POST(req: Request) {
  try {
    // Transcription runs on the server's Groq key, so only signed-in users may
    // use it. Without this it is an anonymous, billable audio proxy.
    if (!adminAuth) {
      return NextResponse.json({ error: 'Server authentication is not configured.' }, { status: 503 });
    }

    const authHeader = req.headers.get('authorization') || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!bearer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      await adminAuth.verifyIdToken(bearer, true);
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let formData;
    try {
      formData = await req.formData();
    } catch (e) {
      console.error('FormData parsing failed. Request body might have been too large and truncated by Next.js.', e);
      return NextResponse.json({ error: 'Audio file is too large or corrupted.' }, { status: 413 });
    }
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }
    if (file.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: 'Audio file is too large.' }, { status: 413 });
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
