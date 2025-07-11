import { useState, useRef, useCallback } from 'react';

export interface VoiceRecorderState {
  isRecording: boolean;
  isProcessing: boolean;
  audioLevel: number;
  error: string | null;
  transcript: string | null;
}

export interface VoiceRecorderControls {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  clearTranscript: () => void;
}

export interface UseVoiceRecorderReturn {
  state: VoiceRecorderState;
  controls: VoiceRecorderControls;
}

export const useVoiceRecorder = (): UseVoiceRecorderReturn => {
  const [state, setState] = useState<VoiceRecorderState>({
    isRecording: false,
    isProcessing: false,
    audioLevel: 0,
    error: null,
    transcript: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Fonction pour analyser le niveau audio (visualisation)
  const analyzeAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculer le niveau audio moyen
    const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
    const normalizedLevel = Math.min(average / 128, 1); // Normaliser entre 0 et 1

    setState(prev => ({ ...prev, audioLevel: normalizedLevel }));

    // Continuer l'animation si on enregistre
    if (state.isRecording) {
      animationFrameRef.current = requestAnimationFrame(analyzeAudioLevel);
    }
  }, [state.isRecording]);

  // Démarrer l'enregistrement
  const startRecording = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null, transcript: null }));

      // Demander l'accès au microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      });

      // Créer le contexte audio pour l'analyse
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Configurer MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Événements MediaRecorder
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Arrêter le stream
        stream.getTracks().forEach(track => track.stop());
        
        // Nettoyer le contexte audio
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }

        // Arrêter l'animation
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }

        setState(prev => ({ 
          ...prev, 
          isRecording: false,
          isProcessing: true,
          audioLevel: 0 
        }));

        // Envoyer l'audio pour transcription
        await transcribeAudio(audioBlob);
      };

      // Démarrer l'enregistrement
      mediaRecorder.start();
      setState(prev => ({ ...prev, isRecording: true }));

      // Démarrer l'analyse du niveau audio
      analyzeAudioLevel();

    } catch (error) {
      console.error('Erreur lors du démarrage de l\'enregistrement:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Impossible d\'accéder au microphone. Vérifiez les permissions.',
        isRecording: false 
      }));
    }
  }, [analyzeAudioLevel]);

  // Arrêter l'enregistrement
  const stopRecording = useCallback(async () => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
    }
  }, [state.isRecording]);

  // Transcrire l'audio avec l'API Whisper
  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la transcription');
      }

      const data = await response.json();
      
      setState(prev => ({ 
        ...prev, 
        transcript: data.text,
        isProcessing: false 
      }));

    } catch (error) {
      console.error('Erreur lors de la transcription:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Erreur lors de la transcription audio',
        isProcessing: false 
      }));
    }
  }, []);

  // Effacer la transcription
  const clearTranscript = useCallback(() => {
    setState(prev => ({ ...prev, transcript: null, error: null }));
  }, []);

  // Nettoyage lors du démontage
  const cleanup = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, [state.isRecording]);

  return {
    state,
    controls: {
      startRecording,
      stopRecording,
      clearTranscript,
    },
  };
};