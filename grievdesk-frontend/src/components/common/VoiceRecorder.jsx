import React, { useState, useRef, useEffect } from 'react'
import { Mic, Square, Trash2, Check, AlertCircle } from 'lucide-react'

const PREFERRED_MIMES = [
  { mime: 'audio/webm;codecs=opus', ext: '.webm' },
  { mime: 'audio/webm', ext: '.webm' },
  { mime: 'audio/ogg;codecs=opus', ext: '.ogg' },
  { mime: 'audio/ogg', ext: '.ogg' },
  { mime: 'audio/mp4', ext: '.mp4' },
]

export function VoiceRecorder({ onRecordingComplete, onCancel }) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [recordedExt, setRecordedExt] = useState('.webm')
  const [error, setError] = useState(null)

  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const audioChunksRef = useRef([])
  const timerRef = useRef(null)
  const audioUrlRef = useRef(null)

  useEffect(() => {
    audioUrlRef.current = audioUrl
  }, [audioUrl])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop()
        } catch {
          // Ignore unmount stop errors
        }
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const startRecording = async () => {
    setError(null)
    setAudioBlob(null)
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
    audioChunksRef.current = []

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Audio recording is not supported in this browser. Try live voice dictation instead.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      let chosen = null
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        chosen = PREFERRED_MIMES.find((m) => MediaRecorder.isTypeSupported(m.mime)) || null
      }

      const mediaRecorder = chosen
        ? new MediaRecorder(stream, { mimeType: chosen.mime })
        : new MediaRecorder(stream)

      const actualMime = mediaRecorder.mimeType || chosen?.mime || 'audio/webm'
      const ext =
        chosen?.ext ||
        (actualMime.includes('mp4') ? '.mp4' : actualMime.includes('ogg') ? '.ogg' : '.webm')
      setRecordedExt(ext)

      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        const blob = new Blob(audioChunksRef.current, { type: actualMime })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
      }

      mediaRecorder.start(200)
      setIsRecording(true)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1)
      }, 1000)
    } catch {
      setError('Microphone access was denied or no microphone was found.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }

  const handleDiscard = () => {
    if (isRecording) stopRecording()
    setAudioBlob(null)
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
    setRecordingTime(0)
    if (onCancel) onCancel()
  }

  const handleConfirm = () => {
    if (audioBlob) {
      const file = new File([audioBlob], `voice_note${recordedExt}`, {
        type: audioBlob.type || 'audio/webm',
      })
      onRecordingComplete(audioBlob, file)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  return (
    <div className="flex flex-col gap-2 p-3 rounded-2xl bg-slate-900 text-white shadow-elevation">
      <div className="flex items-center justify-between gap-3">
        {!isRecording && !audioBlob ? (
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-slate-300">Record an audio voice note to attach to your complaint</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={startRecording}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition-colors"
              >
                <Mic className="w-3.5 h-3.5" /> Start Recording
              </button>
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-2.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ) : isRecording ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
              </span>
              <span className="text-xs font-mono font-medium text-rose-300">
                Recording: {formatTime(recordingTime)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={stopRecording}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-semibold text-white transition-colors"
              >
                <Square className="w-3 h-3 fill-current" /> Stop
              </button>
              <button
                type="button"
                onClick={handleDiscard}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
                title="Discard"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <audio src={audioUrl} controls className="h-8 max-w-[180px] sm:max-w-xs" />
              <span className="text-xs text-slate-400 font-mono">({formatTime(recordingTime)})</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleConfirm}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors"
              >
                <Check className="w-3.5 h-3.5" /> Send Voice Note
              </button>
              <button
                type="button"
                onClick={handleDiscard}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
                title="Discard"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-rose-400 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </p>
      )}
    </div>
  )
}
