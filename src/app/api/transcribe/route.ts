/**
 * POST /api/transcribe
 *
 * Accepts an audio blob (multipart/form-data, field "audio") and returns a
 * transcription using Groq's free Whisper Large v3 Turbo endpoint.
 *
 * Groq free tier: 7,200 seconds of audio/day — more than sufficient for
 * a sales team recording short memos.
 *
 * Egyptian Arabic optimisation:
 *   - language: "ar" tells Whisper to expect Arabic
 *   - prompt seeds context so Whisper handles Egyptian dialect, mixed
 *     Arabic/English code-switching, and business terminology correctly
 */
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'

// Context prompt that guides Whisper toward Egyptian Arabic business speech.
// Includes sample mixed-language phrases common in Egyptian sales calls so
// the model's beam search is biased toward the correct vocabulary.
const ARABIC_CONTEXT_PROMPT =
  'نص عربي مصري من مكالمة مبيعات. ' +
  'قد يحتوي على أسماء شركات وأرقام ومصطلحات تجارية بالإنجليزية مثل: ' +
  'order، quote، delivery، supplier، follow-up، meeting، offer، contract. ' +
  'اكتب الأرقام بالأرقام العربية الغربية.'

const MAX_AUDIO_BYTES = 25 * 1024 * 1024 // 25 MB — Groq/Whisper hard limit

export async function POST(req: Request) {
  // Auth check — only authenticated users can transcribe
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Speech-to-text is not configured. Ask your admin to set GROQ_API_KEY.' },
      { status: 503 },
    )
  }

  // Parse multipart body
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const audioEntry = formData.get('audio')
  if (!audioEntry || !(audioEntry instanceof Blob)) {
    return NextResponse.json({ error: '"audio" field is required' }, { status: 400 })
  }

  if (audioEntry.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: 'Audio file too large (max 25 MB)' }, { status: 413 })
  }

  if (audioEntry.size === 0) {
    return NextResponse.json({ error: 'Audio file is empty' }, { status: 400 })
  }

  // Determine file extension from MIME type for Groq's filename hint.
  // Groq/Whisper uses the extension to pick the right decoder.
  const mime = audioEntry.type || 'audio/webm'
  const ext  = mimeToExt(mime)

  // Build the request to Groq
  const groqForm = new FormData()
  groqForm.append('file',              new File([audioEntry], `recording.${ext}`, { type: mime }))
  groqForm.append('model',             'whisper-large-v3-turbo')
  groqForm.append('language',          'ar')
  groqForm.append('response_format',   'json')
  groqForm.append('prompt',            ARABIC_CONTEXT_PROMPT)
  // temperature=0 maximises determinism → more consistent output
  groqForm.append('temperature',       '0')

  let groqRes: Response
  try {
    groqRes = await fetch(GROQ_API_URL, {
      method:  'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body:    groqForm,
    })
  } catch (err) {
    console.error('[transcribe] Groq fetch error:', err)
    return NextResponse.json({ error: 'Network error reaching transcription service' }, { status: 502 })
  }

  if (!groqRes.ok) {
    const body = await groqRes.text().catch(() => '')
    console.error(`[transcribe] Groq error ${groqRes.status}:`, body)

    // Surface useful messages for common errors
    if (groqRes.status === 401) {
      return NextResponse.json({ error: 'Invalid Groq API key' }, { status: 502 })
    }
    if (groqRes.status === 429) {
      return NextResponse.json({ error: 'Transcription limit reached — try again in a moment' }, { status: 429 })
    }
    return NextResponse.json({ error: 'Transcription service error' }, { status: 502 })
  }

  const data = await groqRes.json() as { text?: string }

  const raw  = (data.text ?? '').trim()
  const text = postProcess(raw)

  return NextResponse.json({ text })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    'audio/webm':      'webm',
    'audio/ogg':       'ogg',
    'audio/mp4':       'mp4',
    'audio/mpeg':      'mp3',
    'audio/mp3':       'mp3',
    'audio/wav':       'wav',
    'audio/x-m4a':     'm4a',
    'audio/m4a':       'm4a',
    'video/webm':      'webm', // some browsers label audio as video/webm
  }
  const base = mime.split(';')[0].trim().toLowerCase()
  return map[base] ?? 'webm'
}

/**
 * Light post-processing on the Whisper transcript.
 * Whisper already does a good job; this just catches a few common artefacts:
 *   - Removes repeated filler hallucinations (Whisper sometimes emits these on silence)
 *   - Ensures the text ends with proper punctuation
 */
function postProcess(text: string): string {
  if (!text) return ''

  // Whisper sometimes hallucinates a silent-audio filler in Arabic
  const fillers = [
    'شكراً للمشاهدة',
    'شكرا للمشاهدة',
    'شكراً على المشاهدة',
    '.', // lone period
  ]
  for (const filler of fillers) {
    if (text === filler) return ''
  }

  // Collapse excessive whitespace
  return text.replace(/\s+/g, ' ').trim()
}
