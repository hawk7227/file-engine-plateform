'use client';

/**
 * FILE ENGINE - Feedback Input
 * 
 * Input section for user feedback with:
 * - Text input
 * - Voice input (with waveform)
 * - Perfect! / Fix This buttons
 */

import { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Check,
  Wrench,
  Send,
  Loader2
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface FeedbackInputProps {
  onPerfect: () => void;
  onFix: (feedback: string, voiceTranscript?: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

// ============================================
// COMPONENT
// ============================================

export function FeedbackInput({
  onPerfect,
  onFix,
  isLoading = false,
  disabled = false
}: FeedbackInputProps) {
  const [feedback, setFeedback] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const recognitionRef = useRef<any>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setVoiceTranscript(transcript);
          setFeedback(transcript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
        };

        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Start/stop recording
  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      recognitionRef.current?.stop();
      setIsRecording(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        // Animate audio level
        const updateAudioLevel = () => {
          if (!analyserRef.current) return;
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average / 255);
          animationRef.current = requestAnimationFrame(updateAudioLevel);
        };
        updateAudioLevel();

        recognitionRef.current?.start();
        setIsRecording(true);
        setVoiceTranscript(null);
      } catch (error) {
        console.error('Error starting recording:', error);
      }
    }
  };

  const handleSubmit = () => {
    if (feedback.trim() || voiceTranscript) {
      onFix(feedback.trim(), voiceTranscript || undefined);
      setFeedback('');
      setVoiceTranscript(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isDisabled = disabled || isLoading;

  return (
    <div className="border-t border-zinc-800 bg-zinc-900/50 p-4">
      {/* Prompt */}
      <div className="text-sm text-zinc-400 mb-3">
        How does it look?
      </div>

      {/* Input Row */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 relative">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe any fixes needed..."
            disabled={isDisabled}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-zinc-600 disabled:opacity-50"
            rows={1}
          />
        </div>

        {/* Voice Input Button */}
        <button
          onClick={toggleRecording}
          disabled={isDisabled || !recognitionRef.current}
          className={`relative p-3 rounded-lg transition-all ${
            isRecording
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title={isRecording ? 'Stop recording' : 'Start voice input'}
        >
          {isRecording ? (
            <>
              <MicOff className="w-5 h-5 relative z-10" />
              {/* Waveform indicator */}
              <div
                className="absolute inset-0 bg-red-400 rounded-lg opacity-50"
                style={{
                  transform: `scale(${1 + audioLevel * 0.5})`,
                  transition: 'transform 0.1s ease-out'
                }}
              />
            </>
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Voice Transcript Preview */}
      {voiceTranscript && (
        <div className="mb-3 px-3 py-2 bg-zinc-800/50 rounded-lg border border-zinc-700">
          <div className="text-xs text-zinc-500 mb-1">Voice transcript:</div>
          <div className="text-sm text-zinc-300">{voiceTranscript}</div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={onPerfect}
          disabled={isDisabled}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check className="w-4 h-4" />
          Perfect!
        </button>

        <button
          onClick={handleSubmit}
          disabled={isDisabled || (!feedback.trim() && !voiceTranscript)}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Fixing...
            </>
          ) : (
            <>
              <Wrench className="w-4 h-4" />
              Fix This
            </>
          )}
        </button>

        {feedback.trim() && (
          <button
            onClick={handleSubmit}
            disabled={isDisabled}
            className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
            title="Send feedback"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default FeedbackInput;
