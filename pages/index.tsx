import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useVoiceRecorder } from '../utils/useVoiceRecorder';

// Types pour TypeScript
interface MenuItem {
  id: number;
  name: string;
  price: number;
  image: string;
  description: string;
  ingredients: string[];
  allergens: string[];
  tags: string[];
  vegetarian: boolean;
  vegan: boolean;
  halal: boolean;
  popular: boolean;
  spicy: boolean;
  preparationTime: string;
  cheeseRemovable?: boolean;
}

interface MenuData {
  restaurant: {
    name: string;
    description: string;
    currency: string;
  };
  categories: {
    [key: string]: {
      name: string;
      icon: string;
      description: string;
    };
  };
  menu: {
    [key: string]: MenuItem[];
  };
}

export default function Home() {
  const [currentCategory, setCurrentCategory] = useState('all');
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [activeFilters, setActiveFilters] = useState({
    vegetarian: false,
    vegan: false,
    halal: false,
    noAllergens: false,
    popular: false,
    noCheese: false
  });
  const [showTranscript, setShowTranscript] = useState(false);
  const [assistantMessage, setAssistantMessage] = useState<string>('');
  const [conversationHistory, setConversationHistory] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
  }>>([]);
  const [isThinking, setIsThinking] = useState(false);

  // Hook vocal
  const { state: voiceState, controls: voiceControls } = useVoiceRecorder();

  // Charger les données du menu
  useEffect(() => {
    const loadMenuData = async () => {
      try {
        const response = await fetch('/data/menu.json');
        const data = await response.json();
        setMenuData(data);
      } catch (error) {
        console.error('Erreur lors du chargement du menu:', error);
      }
    };
    loadMenuData();
  }, []);

  // Filtrer les éléments selon la catégorie et les filtres
  useEffect(() => {
    if (!menuData) return;

    let items: MenuItem[] = [];
    
    // Filtrer par catégorie
    if (currentCategory === 'all') {
      items = Object.values(menuData.menu).flat();
    } else {
      items = menuData.menu[currentCategory] || [];
    }

    // Appliquer les filtres standards
    if (activeFilters.vegetarian) {
      items = items.filter(item => item.vegetarian);
    }
    if (activeFilters.vegan) {
      items = items.filter(item => item.vegan);
    }
    if (activeFilters.halal) {
      items = items.filter(item => item.halal);
    }
    if (activeFilters.popular) {
      items = items.filter(item => item.popular);
    }
    if (activeFilters.noAllergens) {
      items = items.filter(item => item.allergens.length === 0);
    }
    
    // CORRECTION : Filtre sans fromage - CACHER les plats avec fromage
    if (activeFilters.noCheese) {
      items = items.filter(item => {
        // Garder seulement les plats qui :
        // 1. N'ont pas de lait dans les allergènes, OU
        // 2. Peuvent être préparés sans fromage (cheeseRemovable = true)
        return !item.allergens.includes('lait') || item.cheeseRemovable === true;
      });
    }

    console.log('Filtres appliqués:', activeFilters);
    console.log('Items filtrés:', items);
    
    setFilteredItems(items);
  }, [menuData, currentCategory, activeFilters]);

  // Détecter la langue du navigateur
  const getBrowserLanguage = () => {
    const lang = navigator.language.split('-')[0];
    return ['fr', 'en', 'es', 'de', 'it'].includes(lang) ? lang : 'fr';
  };

  // Message de salutation selon la langue
  const getWelcomeMessage = () => {
    const lang = getBrowserLanguage();
    const messages = {
      fr: "Bonjour, je suis Fred votre serveur digital ! Je suis là pour vous aider, vous orienter et vous expliquer le menu. Alors dites-moi, qu'est-ce qui vous ferait plaisir aujourd'hui ?",
      en: "Hello, I'm Fred your digital waiter! I'm here to help you, guide you and explain the menu. So tell me, what would you like today?",
      es: "¡Hola, soy Fred tu camarero digital! Estoy aquí para ayudarte, orientarte y explicarte la carta. Entonces dime, ¿qué te gustaría hoy?",
      de: "Hallo, ich bin Fred, Ihr digitaler Kellner! Ich bin hier, um Ihnen zu helfen, Sie zu führen und das Menü zu erklären. Also sagen Sie mir, was hätten Sie heute gerne?",
      it: "Ciao, sono Fred il vostro cameriere digitale! Sono qui per aiutarvi, guidarvi e spiegarvi il menu. Allora ditemi, cosa vi farebbe piacere oggi?"
    };
    return messages[lang as keyof typeof messages] || messages.fr;
  };

  // Gérer le clic sur le bouton vocal
  const handleVoiceClick = async () => {
    if (voiceState.isRecording) {
      await voiceControls.stopRecording();
    } else {
      // Première utilisation : dire le message de bienvenue
      if (!assistantMessage) {
        const welcomeMsg = getWelcomeMessage();
        setAssistantMessage(welcomeMsg);
        speakMessage(welcomeMsg);
      }
      await voiceControls.startRecording();
    }
  };

  // Synthèse vocale simple avec Web Speech API
  const speakMessage = (message: string) => {
    if ('speechSynthesis' in window) {
      // Arrêter toute synthèse en cours
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = navigator.language;
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      window.speechSynthesis.speak(utterance);
    }
  };

  // Traiter la transcription reçue
  useEffect(() => {
    if (voiceState.transcript) {
      setShowTranscript(true);
      console.log('Transcription reçue:', voiceState.transcript);
      // Traitement intelligent avec ChatGPT
      processUserInputWithAI(voiceState.transcript);
    }
  }, [voiceState.transcript]);

  // Traitement intelligent avec ChatGPT
  const processUserInputWithAI = async (userMessage: string) => {
    setIsThinking(true);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          menuData: menuData,
          conversationHistory: conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la communication avec l\'assistant');
      }

      const data = await response.json();
      
      // Mettre à jour l'historique de conversation
      const newHistory = [
        ...conversationHistory,
        { role: 'user' as const, content: userMessage },
        { role: 'assistant' as const, content: data.response },
      ];
      setConversationHistory(newHistory);
      
      // Afficher la réponse
      setAssistantMessage(data.response);
      speakMessage(data.response);
      
      // Exécuter les actions suggérées par l'IA
      if (data.actions) {
        executeAIActions(data.actions);
      }
      
    } catch (error) {
      console.error('Erreur lors du traitement IA:', error);
      const fallbackMessage = "Désolé, j'ai un petit problème technique. Pouvez-vous répéter votre demande ?";
      setAssistantMessage(fallbackMessage);
      speakMessage(fallbackMessage);
    } finally {
      setIsThinking(false);
    }
  };

  // Exécuter les actions suggérées par l'IA
  const executeAIActions = (actions: any) => {
    console.log('Actions reçues de l\'IA:', actions);
    
    // PRIORITÉ 1 : Changer de catégorie EN PREMIER
    if (actions.filterCategory) {
      console.log('Changement de catégorie vers:', actions.filterCategory);
      setCurrentCategory(actions.filterCategory);
    }
    
    // PRIORITÉ 2 : Réinitialiser les filtres puis appliquer les nouveaux
    if (actions.setFilters) {
      console.log('Application des filtres:', actions.setFilters);
      
      // Réinitialiser TOUS les filtres d'abord
      setActiveFilters({
        vegetarian: false,
        vegan: false,
        halal: false,
        noAllergens: false,
        popular: false,
        noCheese: false
      });
      
      // Puis appliquer les nouveaux filtres après un délai
      setTimeout(() => {
        setActiveFilters(prev => ({
          ...prev,
          ...actions.setFilters
        }));
      }, 100);
    }
    
    // PRIORITÉ 3 : Gérer les filtres personnalisés intelligents
    if (actions.customFilters) {
      console.log('Filtres personnalisés:', actions.customFilters);
      
      // Filtre pour les plats avec fromage
      if (actions.customFilters.withCheese) {
        // Réinitialiser les filtres et ne montrer que les plats avec fromage
        setActiveFilters({
          vegetarian: false,
          vegan: false,
          halal: false,
          noAllergens: false,
          popular: false,
          noCheese: false // Pas de filtre sans fromage
        });
        
        // Changer vers "Tout" pour voir tous les plats avec fromage
        setCurrentCategory('all');
        
        // TODO: Implémenter un filtre "avec fromage" plus tard
      }
    }
    
    // PRIORITÉ 4 : Gérer les recommandations spécifiques
    if (actions.recommendedItems) {
      console.log('Plats recommandés:', actions.recommendedItems);
      // TODO: Mettre en évidence les plats recommandés
    }
    
    if (actions.showItems) {
      console.log('Plats à afficher:', actions.showItems);
      // TODO: Afficher seulement ces plats spécifiques
    }
  };

  const toggleFilter = (filterKey: keyof typeof activeFilters) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterKey]: !prev[filterKey]
    }));
  };

  const getCategoryTitle = () => {
    if (!menuData) return 'Chargement...';
    
    if (currentCategory === 'all') {
      return 'Notre Menu';
    }
    
    return menuData.categories[currentCategory]?.name || 'Menu';
  };

  const getActiveFiltersCount = () => {
    return Object.values(activeFilters).filter(Boolean).length;
  };

  if (!menuData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🍽️</div>
          <h2 className="text-2xl font-bold text-gray-800">Chargement du menu...</h2>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>FOODVOICE - Menu Interactif</title>
        <meta name="description" content="Menu interactif avec assistant vocal" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen">
        {/* Header mobile-first */}
        <header className="bg-white shadow-lg safe-top">
          <div className="max-w-7xl mx-auto px-4 py-4 xs:py-6">
            <div className="text-center">
              <h1 className="text-3xl xs:text-4xl font-bold text-gray-800 mb-2">
                🍽️ {menuData.restaurant.name}
              </h1>
              <p className="text-gray-600 text-base xs:text-lg">
                {menuData.restaurant.description}
              </p>
            </div>
          </div>
        </header>

        {/* Navigation par catégories - sticky mobile */}
        <nav className="category-nav">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex overflow-x-auto space-x-1 py-3 xs:py-4 scrollbar-hide scroll-momentum">
              <button
                onClick={() => setCurrentCategory('all')}
                className={`category-button ${
                  currentCategory === 'all' ? 'active' : 'inactive'
                }`}
              >
                <span>🍽️</span>
                <span className="font-medium">Tout</span>
              </button>
              
              {Object.entries(menuData.categories).map(([key, category]) => (
                <button
                  key={key}
                  onClick={() => setCurrentCategory(key)}
                  className={`category-button ${
                    currentCategory === key ? 'active' : 'inactive'
                  }`}
                >
                  <span>{category.icon}</span>
                  <span className="font-medium">{category.name}</span>
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* Filtres avancés - mobile optimisé */}
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide scroll-momentum">
              <span className="text-sm text-gray-600 whitespace-nowrap flex-shrink-0">Filtres:</span>
              
              {[
                { key: 'vegetarian', label: 'Végétarien', icon: '🥗' },
                { key: 'vegan', label: 'Vegan', icon: '🌱' },
                { key: 'halal', label: 'Halal', icon: '☪️' },
                { key: 'popular', label: 'Populaire', icon: '⭐' },
                { key: 'noCheese', label: 'Sans fromage', icon: '🚫🧀' },
                { key: 'noAllergens', label: 'Sans allergènes', icon: '✅' },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => toggleFilter(filter.key as keyof typeof activeFilters)}
                  className={`filter-button ${
                    activeFilters[filter.key as keyof typeof activeFilters] ? 'active' : 'inactive'
                  }`}
                >
                  <span className="text-xs">{filter.icon}</span>
                  <span>{filter.label}</span>
                </button>
              ))}
              
              {getActiveFiltersCount() > 0 && (
                <button
                  onClick={() => setActiveFilters({
                    vegetarian: false,
                    vegan: false,
                    halal: false,
                    noAllergens: false,
                    popular: false,
                    noCheese: false
                  })}
                  className="ml-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm hover:bg-red-200 transition-all mobile-tap flex-shrink-0"
                >
                  Effacer ({getActiveFiltersCount()})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        <main className="max-w-7xl mx-auto px-4 py-6 xs:py-8 pb-32 xs:pb-40">
          {/* Zone d'interaction avec l'assistant - mobile optimisée */}
          {(assistantMessage || voiceState.transcript || voiceState.error) && (
            <div className="bg-white rounded-2xl shadow-card p-4 xs:p-6 mb-6 xs:mb-8 border-l-4 border-secondary-500 animate-fade-in-up">
              <div className="flex items-start space-x-3 xs:space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 xs:w-12 xs:h-12 bg-secondary-500 rounded-full flex items-center justify-center text-white text-lg xs:text-xl">
                    🤖
                  </div>
                </div>
                <div className="flex-1 space-y-3 xs:space-y-4 min-w-0">
                  {/* Message de l'assistant */}
                  {assistantMessage && (
                    <div className="chat-bubble assistant">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-secondary-800 text-sm xs:text-base">Fred (Assistant)</h4>
                        <button
                          onClick={() => speakMessage(assistantMessage)}
                          className="text-secondary-600 hover:text-secondary-800 transition-colors mobile-tap p-1"
                          title="Réécouter le message"
                        >
                          🔊
                        </button>
                      </div>
                      <p className="text-secondary-700 leading-relaxed text-sm xs:text-base">{assistantMessage}</p>
                    </div>
                  )}

                  {/* Transcription de l'utilisateur */}
                  {voiceState.transcript && showTranscript && (
                    <div className="chat-bubble user">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-success-800 text-sm xs:text-base">Vous avez dit :</h4>
                        <button
                          onClick={() => {
                            setShowTranscript(false);
                            voiceControls.clearTranscript();
                          }}
                          className="text-success-600 hover:text-success-800 transition-colors mobile-tap p-1 text-sm"
                        >
                          ✕
                        </button>
                      </div>
                      <p className="text-success-700 italic text-sm xs:text-base">"{voiceState.transcript}"</p>
                    </div>
                  )}

                  {/* Erreurs */}
                  {voiceState.error && (
                    <div className="chat-bubble error">
                      <h4 className="font-semibold text-red-800 mb-2 text-sm xs:text-base">Erreur :</h4>
                      <p className="text-red-700 text-sm xs:text-base">{voiceState.error}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Titre de la section */}
          <div className="text-center mb-6 xs:mb-8">
            <h2 className="text-2xl xs:text-3xl font-bold text-gray-800 mb-2">
              {getCategoryTitle()}
            </h2>
            <p className="text-gray-600 text-sm xs:text-base">
              {filteredItems.length} plat{filteredItems.length > 1 ? 's' : ''} disponible{filteredItems.length > 1 ? 's' : ''}
              {getActiveFiltersCount() > 0 && ` (${getActiveFiltersCount()} filtre${getActiveFiltersCount() > 1 ? 's' : ''} actif${getActiveFiltersCount() > 1 ? 's' : ''})`}
            </p>
          </div>

          {/* Message si aucun résultat */}
          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <div className="text-5xl xs:text-6xl mb-4">🤷‍♂️</div>
              <h3 className="text-lg xs:text-xl font-semibold text-gray-800 mb-2">
                Aucun plat ne correspond à vos critères
              </h3>
              <p className="text-gray-600 mb-4 text-sm xs:text-base">
                Essayez de modifier vos filtres ou votre catégorie
              </p>
              <button
                onClick={() => {
                  setCurrentCategory('all');
                  setActiveFilters({
                    vegetarian: false,
                    vegan: false,
                    halal: false,
                    noAllergens: false,
                    popular: false,
                    noCheese: false
                  });
                }}
                className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg font-medium transition-colors mobile-tap"
              >
                Voir tout le menu
              </button>
            </div>
          )}

          {/* Grille des plats - mobile-first */}
          <div className="food-grid">
            {filteredItems.map((item) => (
              <div key={item.id} className="food-card animate-fade-in-up">
                {/* Image du plat */}
                <div className="h-44 xs:h-48 bg-gradient-to-br from-orange-200 to-red-200 flex items-center justify-center relative">
                  <div className="text-5xl xs:text-6xl">🍽️</div>
                  
                  {/* Badges - repositionnés pour mobile */}
                  <div className="absolute top-2 xs:top-3 left-2 xs:left-3 flex flex-wrap gap-1">
                    {item.popular && (
                      <span className="food-badge popular">
                        ⭐ Populaire
                      </span>
                    )}
                    {item.spicy && (
                      <span className="food-badge spicy">
                        🌶️ Épicé
                      </span>
                    )}
                    {item.vegetarian && (
                      <span className="food-badge vegetarian">
                        🥗 Végé
                      </span>
                    )}
                    {item.vegan && (
                      <span className="food-badge vegan">
                        🌱 Vegan
                      </span>
                    )}
                  </div>

                  {/* Temps de préparation */}
                  <div className="absolute top-2 xs:top-3 right-2 xs:right-3">
                    <span className="bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-xs">
                      ⏱️ {item.preparationTime}
                    </span>
                  </div>
                </div>

                {/* Contenu - optimisé mobile */}
                <div className="p-4 xs:p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg xs:text-xl font-bold text-gray-800 leading-tight">
                      {item.name}
                    </h3>
                    <span className="text-xl xs:text-2xl font-bold text-primary-600 flex-shrink-0 ml-2">
                      {item.price}{menuData.restaurant.currency}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">
                    {item.description}
                  </p>

                  {/* Allergènes - compacts sur mobile */}
                  {item.allergens.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-1">Allergènes:</p>
                      <div className="flex flex-wrap gap-1">
                        {item.allergens.map((allergen) => (
                          <span
                            key={allergen}
                            className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs"
                          >
                            {allergen}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Options spéciales */}
                  {item.cheeseRemovable && (
                    <div className="mb-4">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                        🧀 Sans fromage possible
                      </span>
                    </div>
                  )}
                  
                  {/* Bouton Commander - mobile optimisé */}
                  <button className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors mobile-tap touch-target">
                    Commander
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* Bouton vocal intelligent en bas - mobile-first */}
        <div className="fixed bottom-4 xs:bottom-6 left-1/2 transform -translate-x-1/2 z-20 safe-bottom">
          <div className="flex flex-col items-center space-y-2 xs:space-y-3">
            {/* Visualisation du niveau audio */}
            {voiceState.isRecording && (
              <div className="flex space-x-1 mb-1 xs:mb-2">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="audio-bar"
                    style={{
                      height: `${6 + (voiceState.audioLevel * 16 * (i + 1))}px`,
                      opacity: voiceState.audioLevel > i * 0.2 ? 1 : 0.3,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Bouton principal - responsive */}
            <button
              onClick={handleVoiceClick}
              disabled={voiceState.isProcessing}
              className={`voice-button ${
                voiceState.isRecording
                  ? 'recording'
                  : voiceState.isProcessing
                  ? 'processing'
                  : 'ready'
              }`}
            >
              {voiceState.isProcessing ? '⏳' : voiceState.isRecording ? '🛑' : '🎤'}
            </button>
            
            {/* Indication dynamique - mobile optimisée */}
            <div className="text-center max-w-xs">
              <p className="text-xs xs:text-sm font-medium text-gray-700 bg-white px-3 xs:px-4 py-1 xs:py-2 rounded-full shadow-lg glass">
                {voiceState.isProcessing
                  ? 'Traitement...'
                  : isThinking
                  ? 'Fred réfléchit...'
                  : voiceState.isRecording
                  ? 'En écoute... (tapez pour arrêter)'
                  : assistantMessage
                  ? 'Parlez-moi !'
                  : 'Tapez pour commencer'
                }
              </p>
            </div>

            {/* Raccourcis rapides - avec IA */}
            {!voiceState.isRecording && !voiceState.isProcessing && !isThinking && (
              <div className="hidden xs:flex space-x-2 mt-2 xs:mt-3">
                <button
                  onClick={() => processUserInputWithAI('Je veux des pizzas')}
                  className="quick-action"
                >
                  🍕 Pizzas
                </button>
                <button
                  onClick={() => processUserInputWithAI('Montrez-moi les pâtes')}
                  className="quick-action"
                >
                  🍝 Pâtes
                </button>
                <button
                  onClick={() => processUserInputWithAI('Je suis végétarien')}
                  className="quick-action"
                >
                  🥗 Végé
                </button>
              </div>
            )}

            {/* Indicateur de réflexion IA */}
            {isThinking && (
              <div className="flex items-center space-x-2 mt-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-secondary-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-secondary-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-secondary-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs text-gray-600">Fred réfléchit...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
