import { NextApiRequest, NextApiResponse } from 'next';
import fetch from 'node-fetch';

// Interface pour la réponse ChatGPT
interface ChatGPTResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface ChatRequest {
  message: string;
  menuData?: any;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

interface ChatResponse {
  response: string;
  actions?: {
    filterCategory?: string;
    setFilters?: {
      vegetarian?: boolean;
      vegan?: boolean;
      halal?: boolean;
      noCheese?: boolean;
      noAllergens?: boolean;
      popular?: boolean;
    };
    customFilters?: {
      withCheese?: boolean;
      withMeat?: boolean;
      spicy?: boolean;
    };
    recommendedItems?: number[];
    showItems?: number[];
  };
}

interface ErrorResponse {
  error: string;
  details?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { message, menuData, conversationHistory = [] }: ChatRequest = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message requis' });
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return res.status(500).json({ 
        error: 'Configuration serveur manquante',
        details: 'Clé API OpenAI non configurée' 
      });
    }

    // Système prompt pour Fred le serveur digital
    const systemPrompt = `Tu es Fred, un serveur digital intelligent dans un restaurant. Tu dois comprendre les demandes des clients et adapter automatiquement l'interface pour leur montrer exactement ce qu'ils veulent voir.

MENU DISPONIBLE :
${menuData ? JSON.stringify(menuData, null, 2) : 'Menu non disponible'}

INTELLIGENCE AUTONOME :
Tu dois analyser chaque demande client et décider intelligemment quelles actions prendre pour améliorer son expérience. Tu peux :

1. CHANGER LA CATÉGORIE affichée (pizzas, pates, entrees, desserts, boissons, all)
2. APPLIQUER DES FILTRES (végétarien, vegan, halal, sans fromage, populaire, sans allergènes)
3. CRÉER DES FILTRES PERSONNALISÉS (avec viande, épicé, crémeux, etc.)
4. RECOMMANDER des plats spécifiques

ANALYSE INTELLIGENTE :
- Si quelqu'un dit "j'ai faim" → montre les plats populaires
- Si quelqu'un dit "je n'aime pas le fromage" → cache les plats avec fromage
- Si quelqu'un dit "je veux des pizzas" → montre seulement les pizzas
- Si quelqu'un dit "je suis végétarien" → filtre les plats végétariens
- Si quelqu'un change d'avis → adapte l'affichage accordingly

RÉPONSE INTELLIGENTE :
Après ton analyse, génère une réponse naturelle ET les actions appropriées au format JSON :

{
  "response": "ta réponse naturelle et chaleureuse",
  "actions": {
    "category": "pizzas|pates|entrees|desserts|boissons|all",
    "filters": {
      "vegetarian": true/false,
      "vegan": true/false,
      "halal": true/false,
      "noCheese": true/false,
      "popular": true/false,
      "noAllergens": true/false
    },
    "customFilters": {
      "withCheese": true/false,
      "withMeat": true/false,
      "spicy": true/false
    },
    "recommendedItems": [id1, id2],
    "reasoning": "pourquoi tu as pris ces décisions"
  }
}

EXEMPLES D'INTELLIGENCE :

Demande: "Tu me conseilles quoi ?"
Analyse: Le client veut des recommandations → je montre les plats populaires
{
  "response": "Excellente question ! Je vous recommande nos plats les plus populaires. Notre Pizza Margherita est un classique incontournable, et les Tagliatelles aux Champignons sont divines ! Qu'est-ce qui vous fait envie ?",
  "actions": {
    "category": "all",
    "filters": {"popular": true},
    "reasoning": "Client demande des conseils → je montre les plats populaires"
  }
}

Demande: "Je n'aime pas le fromage"
Analyse: Le client veut éviter le fromage → je cache tous les plats avec fromage
{
  "response": "Parfait ! Voici tous nos délicieux plats sans fromage. Je vous recommande les Penne Arrabbiata, c'est savoureux et naturellement sans fromage !",
  "actions": {
    "category": "all",
    "filters": {"noCheese": true},
    "reasoning": "Client n'aime pas le fromage → je cache les plats avec fromage"
  }
}

Demande: "Finalement je prendrais des pâtes"
Analyse: Le client change d'avis et veut des pâtes → je montre seulement les pâtes
{
  "response": "Parfait ! Passons aux pâtes alors. Voici notre sélection de pâtes fraîches maison. Les Spaghetti Carbonara sont un classique, qu'en pensez-vous ?",
  "actions": {
    "category": "pates",
    "filters": {},
    "reasoning": "Client veut des pâtes → je change vers la catégorie pâtes"
  }
}

IMPORTANT : 
- Sois naturel et chaleureux dans tes réponses
- Prends des décisions intelligentes basées sur le contexte
- Adapte toujours l'interface pour faciliter l'expérience client
- Réponds UNIQUEMENT avec le JSON pur, sans préfixe "json" ou balises markdown
- Format de réponse EXACT : {"response": "...", "actions": {...}}
- JAMAIS de json ou  ou "json" au début
- SEULEMENT le JSON brut qui commence par { et finit par }`;

    // Construire l'historique de conversation
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    // Appel à ChatGPT
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: messages,
        max_tokens: 500,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erreur ChatGPT:', errorText);
      return res.status(response.status).json({
        error: 'Erreur du service IA',
        details: `ChatGPT: ${response.status}`,
      });
    }

    const chatData = await response.json() as ChatGPTResponse;
    const assistantResponse = chatData.choices[0]?.message?.content;

    if (!assistantResponse) {
      return res.status(500).json({
        error: 'Réponse IA vide',
        details: 'Aucune réponse générée par l\'assistant',
      });
    }

    // Parser la réponse JSON intelligente
    let parsedResponse;
    try {
      // Nettoyer la réponse ChatGPT
      let cleanedResponse = assistantResponse.trim();
      
      // Supprimer les préfixes courants
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, ''); // ```json
      cleanedResponse = cleanedResponse.replace(/\s*```$/, ''); // ```
      cleanedResponse = cleanedResponse.replace(/^json\s*/, ''); // json
      cleanedResponse = cleanedResponse.replace(/^"json\s*/, ''); // "json
      cleanedResponse = cleanedResponse.replace(/^\s*```\s*/, ''); // ```
      
      // Trouver le premier { et le dernier }
      const firstBrace = cleanedResponse.indexOf('{');
      const lastBrace = cleanedResponse.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
        cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
      }
      
      console.log('Réponse nettoyée pour parsing:', cleanedResponse);
      
      parsedResponse = JSON.parse(cleanedResponse);
      console.log('JSON parsé avec succès:', parsedResponse);
      
    } catch (error) {
      console.error('Erreur de parsing JSON:', error);
      console.log('Réponse originale:', assistantResponse);
      
      // Fallback : traiter comme texte normal
      return res.status(200).json({
        response: assistantResponse,
        actions: undefined,
      });
    }

    // Construire les actions à partir de la réponse intelligente
    const actions: ChatResponse['actions'] = {};
    
    if (parsedResponse.actions) {
      // Catégorie
      if (parsedResponse.actions.category) {
        actions.filterCategory = parsedResponse.actions.category;
      }
      
      // Filtres standards
      if (parsedResponse.actions.filters) {
        actions.setFilters = parsedResponse.actions.filters;
      }
      
      // Filtres personnalisés
      if (parsedResponse.actions.customFilters) {
        actions.customFilters = parsedResponse.actions.customFilters;
      }
      
      // Recommandations
      if (parsedResponse.actions.recommendedItems) {
        actions.recommendedItems = parsedResponse.actions.recommendedItems;
      }
      
      // Log du raisonnement de l'IA
      if (parsedResponse.actions.reasoning) {
        console.log('Raisonnement de l\'IA:', parsedResponse.actions.reasoning);
      }
    }

    return res.status(200).json({
      response: parsedResponse.response,
      actions: Object.keys(actions).length > 0 ? actions : undefined,
    });

  } catch (error: any) {
    console.error('Erreur API Chat:', error);
    return res.status(500).json({
      error: 'Erreur interne du serveur',
      details: process.env.NODE_ENV === 'development' ? error?.message : 'Erreur inattendue',
    });
  }
}
