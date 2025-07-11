import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

// Configuration pour désactiver le parser par défaut de Next.js
export const config = {
  api: {
    bodyParser: false,
  },
};

interface TranscribeResponse {
  text: string;
  language?: string;
  confidence?: number;
}

interface ErrorResponse {
  error: string;
  details?: string;
}

// Interface pour la réponse de Whisper API
interface WhisperResponse {
  text: string;
  language?: string;
  confidence?: number;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TranscribeResponse | ErrorResponse>
) {
  // Vérifier que c'est une requête POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    // Vérifier que la clé API OpenAI est configurée
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error('Clé API OpenAI manquante');
      return res.status(500).json({ 
        error: 'Configuration serveur manquante',
        details: 'Clé API OpenAI non configurée' 
      });
    }

    // Parser le fichier audio avec formidable
    const form = formidable({
      uploadDir: '/tmp',
      keepExtensions: true,
      maxFileSize: 25 * 1024 * 1024, // 25MB max (limite Whisper)
    });

    const [fields, files] = await form.parse(req);
    
    // Vérifier qu'un fichier audio est présent
    const audioFile = Array.isArray(files.audio) ? files.audio[0] : files.audio;
    if (!audioFile) {
      return res.status(400).json({ 
        error: 'Aucun fichier audio fourni',
        details: 'Le champ "audio" est requis' 
      });
    }

    // Préparer les données pour l'API Whisper
    const formData = new FormData();
    formData.append('file', fs.createReadStream(audioFile.filepath), {
      filename: audioFile.originalFilename || 'audio.webm',
      contentType: audioFile.mimetype || 'audio/webm',
    });
    formData.append('model', 'whisper-1');
    
    // Détecter la langue du navigateur si disponible
    const browserLang = req.headers['accept-language']?.split(',')[0]?.split('-')[0];
    if (browserLang && ['en', 'fr', 'es', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'].includes(browserLang)) {
      formData.append('language', browserLang);
    }

    // Paramètres additionnels pour améliorer la transcription
    formData.append('response_format', 'verbose_json');
    formData.append('temperature', '0'); // Plus déterministe

    console.log('Envoi vers Whisper API...');

    // Appel à l'API Whisper d'OpenAI
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    // Nettoyer le fichier temporaire
    try {
      fs.unlinkSync(audioFile.filepath);
    } catch (cleanupError) {
      console.warn('Impossible de supprimer le fichier temporaire:', cleanupError);
    }

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('Erreur Whisper API:', errorText);
      
      return res.status(whisperResponse.status).json({
        error: 'Erreur lors de la transcription',
        details: `API Whisper: ${whisperResponse.status} - ${errorText}`,
      });
    }

    const transcription = await whisperResponse.json() as WhisperResponse;
    
    // Vérifier que la transcription contient du texte
    if (!transcription.text || transcription.text.trim() === '') {
      return res.status(400).json({
        error: 'Aucun texte détecté',
        details: 'L\'audio ne contient pas de parole identifiable',
      });
    }

    console.log('Transcription réussie:', transcription.text);

    // Retourner la transcription avec métadonnées
    return res.status(200).json({
      text: transcription.text.trim(),
      language: transcription.language || browserLang,
      confidence: transcription.confidence || undefined,
    });

  } catch (error: any) {
    console.error('Erreur lors de la transcription:', error);
    
    // Gestion des erreurs spécifiques
    if (error?.message?.includes('ENOENT')) {
      return res.status(500).json({
        error: 'Erreur de fichier temporaire',
        details: 'Impossible de traiter le fichier audio',
      });
    }
    
    if (error?.message?.includes('fetch')) {
      return res.status(503).json({
        error: 'Service temporairement indisponible',
        details: 'Impossible de contacter l\'API de transcription',
      });
    }

    return res.status(500).json({
      error: 'Erreur interne du serveur',
      details: process.env.NODE_ENV === 'development' ? error?.message || 'Erreur inattendue' : 'Erreur inattendue',
    });
  }
}