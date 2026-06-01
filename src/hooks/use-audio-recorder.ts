'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'processing' | 'error'

interface UseAudioRecorderOptions {
  maxSeconds?: number          // hard stop (default 60)
  onTranscript: (text: string) => void
  onError?: (msg: string) => void
}

interface UseAudioRecorderReturn {
  state:        RecorderState
  secondsLeft:  number
  secondsUsed:  number
  startRecording: () => Promise<void>
  stopRecording:  () => void
  cancelRecording: () => void
  errorMessage: string
}

/**
 * Manages the full record → upload → transcribe lifecycle.
 *
 * Browser audio format notes:
 *   - Chrome / Android WebView → audio/webm;codecs=opus  → .webm
 *   - Safari / iOS             → audio/mp4               → .mp4
 *   - Firefox                  → audio/ogg;codecs=opus   → .ogg
 * Groq Whisper accepts all three natively, so we pass the blob as-is.
 */
export function useAudioRecorder({
  maxSeconds  = 60,
  onTranscript,
  onError,
}: UseAudioRecorderOptions): UseAudioRecorderReturn {
  const [state,       setState]       = useState<RecorderState>('idle')
  const [secondsUsed, setSecondsUsed] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef        = useRef<MediaStream | null>(null)
  const chunksRef        = useRef<Blob[]>([])
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null)
  const secondsRef       = useRef(0)   // synced mirror of secondsUsed for use inside closures
  const cancelledRef     = useRef(false)

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopTracks()
      clearTick()
    }
  }, [])

  function stopTracks() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  function clearTick() {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  function setError(msg: string) {
    setState('error')
    setErrorMessage(msg)
    onError?.(msg)
    stopTracks()
    clearTick()
  }

  // Best MIME type that the current browser supports
  function getSupportedMime(): string {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ]
    for (const mime of candidates) {
      if (MediaRecorder.isTypeSupported(mime)) return mime
    }
    return '' // browser will pick its default
  }

  async function startRecording() {
    if (state === 'recording' || state === 'processing') return

    cancelledRef.current = false
    setError('')          // clear any prior error
    setState('requesting')
    setSecondsUsed(0)
    secondsRef.current = 0
    chunksRef.current  = []

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount:     1,    // mono — smaller file, just as good for speech
          sampleRate:       16000, // 16 kHz matches Whisper's internal resampling target
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl:  true,
        },
      })
    } catch (err: any) {
      const msg =
        err?.name === 'NotAllowedError'
          ? 'Microphone access denied. Please allow microphone in your browser settings.'
          : err?.name === 'NotFoundError'
          ? 'No microphone found on this device.'
          : 'Could not access microphone.'
      setError(msg)
      return
    }

    streamRef.current = stream
    const mime = getSupportedMime()
    const mr   = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
    mediaRecorderRef.current = mr

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    mr.onstop = async () => {
      stopTracks()
      clearTick()

      if (cancelledRef.current) {
        setState('idle')
        setSecondsUsed(0)
        return
      }

      if (chunksRef.current.length === 0) {
        setError('No audio was captured. Please try again.')
        return
      }

      setState('processing')

      const blob = new Blob(chunksRef.current, {
        type: mr.mimeType || 'audio/webm',
      })

      try {
        const fd = new FormData()
        fd.append('audio', blob, `recording.${mimeToExt(blob.type)}`)

        const res  = await fetch('/api/transcribe', { method: 'POST', body: fd })
        const data = await res.json()

        if (!res.ok) {
          setError(data.error ?? 'Transcription failed. Please try again.')
          return
        }

        const text = (data.text ?? '').trim()
        if (!text) {
          setError('No speech detected. Please speak clearly and try again.')
          return
        }

        onTranscript(text)
        setState('idle')
        setSecondsUsed(0)
      } catch {
        setError('Network error. Check your connection and try again.')
      }
    }

    mr.onerror = () => setError('Recording error. Please try again.')

    // Collect data in 250 ms chunks for smoother progress
    mr.start(250)
    setState('recording')

    // Countdown ticker
    timerRef.current = setInterval(() => {
      secondsRef.current += 1
      setSecondsUsed(secondsRef.current)

      if (secondsRef.current >= maxSeconds) {
        stopRecording()
      }
    }, 1000)
  }

  const stopRecording = useCallback(() => {
    clearTick()
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const cancelRecording = useCallback(() => {
    cancelledRef.current = true
    clearTick()
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    stopTracks()
    setState('idle')
    setSecondsUsed(0)
    setErrorMessage('')
  }, [])

  return {
    state,
    secondsLeft:  Math.max(0, maxSeconds - secondsUsed),
    secondsUsed,
    startRecording,
    stopRecording,
    cancelRecording,
    errorMessage,
  }
}

function mimeToExt(mime: string): string {
  const m = mime.split(';')[0].trim().toLowerCase()
  const map: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/ogg':  'ogg',
    'audio/mp4':  'mp4',
    'audio/mpeg': 'mp3',
    'audio/wav':  'wav',
    'audio/m4a':  'm4a',
    'video/webm': 'webm',
  }
  return map[m] ?? 'webm'
}
