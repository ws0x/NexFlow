'use client'

import { useEffect, useRef } from 'react'
import { Mic, Square, Loader2, AlertCircle, X } from 'lucide-react'
import { useAudioRecorder, type RecorderState } from '@/hooks/use-audio-recorder'
import { cn } from '@/lib/utils'

interface VoiceRecordButtonProps {
  /** Called with the final transcribed text */
  onTranscript: (text: string) => void
  /** Append to existing text, or replace it (default: append) */
  mode?: 'append' | 'replace'
  /** Current textarea value — needed for append mode */
  currentValue?: string
  disabled?: boolean
  className?: string
  maxSeconds?: number
}

const MAX_S = 60

/**
 * A self-contained voice recording button.
 *
 * States:
 *   idle        → mic icon, tap to record
 *   requesting  → spinner, waiting for permission
 *   recording   → red pulsing circle + countdown + stop button
 *   processing  → spinner + "Transcribing…"
 *   error       → red alert + message
 *
 * The 60-second limit is always displayed when recording so the user
 * knows exactly how much time they have.
 */
export function VoiceRecordButton({
  onTranscript,
  mode = 'append',
  currentValue = '',
  disabled,
  className,
  maxSeconds = MAX_S,
}: VoiceRecordButtonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef   = useRef<number | null>(null)

  function handleTranscript(text: string) {
    if (mode === 'append' && currentValue.trim()) {
      onTranscript(currentValue.trim() + '\n' + text)
    } else {
      onTranscript(text)
    }
  }

  const {
    state,
    secondsLeft,
    secondsUsed,
    startRecording,
    stopRecording,
    cancelRecording,
    errorMessage,
  } = useAudioRecorder({ maxSeconds, onTranscript: handleTranscript })

  // Simple canvas waveform animation while recording
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (state !== 'recording') {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      return
    }

    let frame = 0
    function draw() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const bars  = 20
      const barW  = canvas.width / bars
      const maxH  = canvas.height * 0.85

      for (let i = 0; i < bars; i++) {
        const t    = (frame * 0.06) + (i * 0.4)
        const h    = (Math.abs(Math.sin(t)) * 0.7 + 0.1 + Math.random() * 0.2) * maxH
        const x    = i * barW + barW * 0.2
        const y    = (canvas.height - h) / 2
        ctx.fillStyle = '#06B6D4'
        ctx.globalAlpha = 0.85
        const radius = barW * 0.25
        ctx.beginPath()
        ctx.roundRect(x, y, barW * 0.6, h, radius)
        ctx.fill()
      }
      frame++
      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [state])

  const pct = (secondsUsed / maxSeconds) * 100

  if (state === 'error') {
    return (
      <div className={cn('flex items-start gap-2 text-xs rounded-lg px-3 py-2', className)}
        style={{ background: 'rgb(239 68 68 / 0.1)', border: '1px solid rgb(239 68 68 / 0.3)', color: '#FCA5A5' }}>
        <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span className="flex-1">{errorMessage}</span>
        <button onClick={cancelRecording} className="shrink-0 opacity-70 hover:opacity-100">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  if (state === 'recording') {
    return (
      <div className={cn('flex flex-col gap-2 rounded-xl p-3', className)}
        style={{ background: 'var(--nf-surface-2)', border: '1px solid var(--nf-accent)' }}>

        {/* Waveform */}
        <canvas
          ref={canvasRef}
          width={240}
          height={36}
          className="w-full rounded"
          style={{ background: 'var(--nf-bg)' }}
        />

        {/* Timer bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-semibold" style={{ color: '#EF4444' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Recording
            </span>
            <span className="font-mono font-bold"
              style={{ color: secondsLeft <= 10 ? '#EF4444' : 'var(--nf-text)' }}>
              {secondsLeft}s left
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--nf-border)' }}>
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${pct}%`,
                background: pct > 80 ? '#EF4444' : 'var(--nf-accent)',
              }}
            />
          </div>
          <p className="text-[10px]" style={{ color: 'var(--nf-subtle)' }}>
            Limit: {maxSeconds}s · Speak clearly · Arabic &amp; English supported
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={stopRecording}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold flex-1 justify-center"
            style={{ background: '#EF444420', color: '#EF4444', border: '1px solid #EF444440' }}>
            <Square className="w-3 h-3 fill-current" />
            Stop &amp; Transcribe
          </button>
          <button
            onClick={cancelRecording}
            className="px-3 py-1.5 rounded-lg text-xs btn-ghost">
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    )
  }

  if (state === 'processing') {
    return (
      <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-xs', className)}
        style={{ background: 'var(--nf-surface-2)', border: '1px solid var(--nf-border)', color: 'var(--nf-muted)' }}>
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" style={{ color: 'var(--nf-accent)' }} />
        Transcribing your audio…
      </div>
    )
  }

  if (state === 'requesting') {
    return (
      <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-xs', className)}
        style={{ background: 'var(--nf-surface-2)', border: '1px solid var(--nf-border)', color: 'var(--nf-muted)' }}>
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
        Requesting microphone…
      </div>
    )
  }

  // Idle state
  return (
    <button
      type="button"
      onClick={startRecording}
      disabled={disabled}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
        'hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed',
        className,
      )}
      style={{
        background:   'var(--nf-accent-glow)',
        border:       '1px solid var(--nf-accent)',
        color:        'var(--nf-accent)',
      }}
      title={`Record audio — up to ${maxSeconds}s. Supports Egyptian Arabic.`}>
      <Mic className="w-3.5 h-3.5 shrink-0" />
      <span>Record ({maxSeconds}s max)</span>
    </button>
  )
}
