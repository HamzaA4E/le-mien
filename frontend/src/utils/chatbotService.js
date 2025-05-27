import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

const API_KEY = 'AIzaSyDG1mwO8y2eWNFZhv7rTBaLX2Lm94jyj2E';

console.warn('Initialisation du service Gemini avec la clé API:', API_KEY ? 'Présente' : 'Manquante');

// Configuration de l'API Gemini
const genAI = new GoogleGenerativeAI(API_KEY, {
    apiVersion: 'v1beta'  // Utiliser la version beta de l'API
});

console.warn('Instance GoogleGenerativeAI créée');

// Initialiser le modèle avec la configuration de base
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",  // Utiliser le modèle flash qui est plus rapide
    generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
    },
    safetySettings: [
        {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
    ]
});

console.warn('Modèle Gemini configuré avec les paramètres:', {
    model: "gemini-2.0-flash",
    temperature: 0.7,
    maxOutputTokens: 1024
});

export const chatWithGemini = async (message, conversationHistory, userInfo) => {
    console.warn('=== GEMINI API CALL ===');
    console.warn('Message:', message);
    console.warn('Conversation history length:', conversationHistory.length);
    console.warn('User info:', userInfo);
    
    try {
        // Vérification de la clé API
        if (!API_KEY) {
            console.error('Erreur: Clé API manquante');
            throw new Error('La clé API Gemini n\'est pas configurée.');
        }

        // Définition du SYSTEM_PROMPT avec les informations de l'utilisateur
        const SYSTEM_PROMPT = `Tu es un assistant professionnel spécialisé dans la création de tickets de support IT.
Ton rôle est de guider les utilisateurs de manière professionnelle et efficace dans la création de leurs tickets.

RÈGLES STRICTES DE CONVERSATION :
1. Tu DOIS suivre l'ordre exact des étapes ci-dessous
2. Tu DOIS attendre une réponse complète à chaque question avant de passer à la suivante
3. Tu DOIS vérifier que chaque information est complète avant de passer à l'étape suivante
4. Tu NE DOIS PAS proposer de créer le ticket avant d'avoir toutes les informations requises
5. Tu DOIS confirmer chaque information importante avec l'utilisateur

INFORMATIONS DÉJÀ CONNUES (ne pas demander) :
- Demandeur: ${userInfo.name}
- Service: ${userInfo.service}
- Société: ${userInfo.company}

ÉTAPES OBLIGATOIRES (à suivre dans l'ordre) :

1. ACCUEIL ET CONTEXTE INITIAL
   - Saluer l'utilisateur
   - Lui demander de décrire brièvement son problème
   - ATTENDRE sa réponse

2. COLLECTE DU TITRE
   - Demander un titre concis et descriptif
   - ATTENDRE sa réponse
   - Confirmer le titre avec l'utilisateur

3. COLLECTE DE LA DESCRIPTION DÉTAILLÉE
   - Demander une description complète incluant :
     * Nature exacte du problème
     * Impact sur le travail
     * Déjà tenté pour résoudre
     * Urgence perçue
   - ATTENDRE sa réponse
   - Vérifier que tous les points sont couverts
   - Si des informations manquent, les demander spécifiquement

4. DÉTERMINATION DE LA CATÉGORIE
   - Analyser la description
   - Proposer une catégorie
   - ATTENDRE la confirmation de l'utilisateur

5. DÉTERMINATION DE LA PRIORITÉ
   - Analyser l'urgence et l'impact
   - Proposer une priorité
   - ATTENDRE la confirmation de l'utilisateur

6. COLLECTE DE L'EMPLACEMENT
   - Demander l'emplacement précis
   - ATTENDRE sa réponse
   - Confirmer l'emplacement

7. RÉSUMÉ ET CONFIRMATION
   - Présenter un résumé complet de toutes les informations
   - Demander confirmation
   - ATTENDRE la confirmation avant de proposer la création

NE PAS PASSER À L'ÉTAPE SUIVANTE SANS AVOIR :
- Reçu une réponse complète
- Vérifié que l'information est suffisante
- Obtenu la confirmation de l'utilisateur

EXEMPLES DE RÉPONSES PROFESSIONNELLES :
- "Je comprends que vous rencontrez un problème de réseau. Pourriez-vous me donner un titre concis qui décrit ce problème ?"
- "Merci pour le titre. Pour mieux comprendre la situation, pourriez-vous me décrire en détail : la nature exacte du problème, son impact sur votre travail, ce que vous avez déjà tenté, et votre perception de l'urgence ?"
- "D'après votre description, je suggère de classer ce ticket dans la catégorie 'Réseau'. Êtes-vous d'accord avec cette catégorie ?"
- "En fonction de l'impact décrit, je propose de définir la priorité comme 'Moyenne'. Cette priorité vous semble-t-elle appropriée ?"
- "Pour finaliser, pourriez-vous me préciser l'emplacement exact où ce problème se produit ?"
- "Voici un résumé des informations collectées. Souhaitez-vous que je procède à la création du ticket ?"`;

        // Ajouter les informations de l'utilisateur au contexte
        const userContext = `Informations de l'utilisateur :
- Demandeur: ${userInfo.name}
- Service: ${userInfo.service}
- Société: ${userInfo.company}`;

        console.warn('Construction du contexte de conversation');
        // Construire le contexte de la conversation
        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: SYSTEM_PROMPT + "\n\n" + userContext,
                },
                ...conversationHistory.map(msg => ({
                    role: msg.role,
                    parts: msg.content,
                })),
            ],
        });
        console.warn('Chat initialisé avec l\'historique');

        console.warn('Envoi du message à l\'API...');
        // Envoyer le message avec gestion des timeouts
        const timeoutDuration = 60000; // Augmenter le timeout à 60 secondes
        const result = await Promise.race([
            chat.sendMessage(message).then(response => {
                console.warn('Réponse brute de l\'API:', response);
                return response;
            }),
            new Promise((_, reject) => 
                setTimeout(() => {
                    console.error('Timeout: Délai d\'attente dépassé après', timeoutDuration, 'ms');
                    reject(new Error('Le temps de réponse est trop long. Veuillez réessayer.'));
                }, timeoutDuration)
            )
        ]);
        console.warn('Réponse reçue de l\'API');

        const response = await result.response;
        console.warn('Texte de la réponse extrait:', response.text());
        return response.text();
    } catch (error) {
        console.error('=== GEMINI API ERROR ===');
        console.error('Type d\'erreur:', error.constructor.name);
        console.error('Message d\'erreur:', error.message);
        console.error('Stack trace:', error.stack);
        
        // Gestion spécifique des erreurs
        if (error.message.includes('API key')) {
            console.error('Erreur de clé API');
            throw new Error('Erreur de configuration de l\'API. Veuillez vérifier la clé API.');
        } else if (error.message.includes('quota')) {
            console.error('Erreur de quota dépassé');
            throw new Error('Limite de requêtes atteinte. Veuillez réessayer plus tard.');
        } else if (error.message.includes('temps de réponse')) {
            console.error('Erreur de timeout');
            throw new Error('Le temps de réponse est trop long. Veuillez réessayer.');
        } else if (error.message.includes('safety')) {
            console.error('Erreur de sécurité');
            throw new Error('Le contenu a été bloqué pour des raisons de sécurité.');
        } else {
            console.error('Erreur inattendue:', error);
            throw new Error('Une erreur est survenue lors de la communication avec l\'assistant. Veuillez réessayer.');
        }
    }
};

export const createTicketFromChat = async (ticketData) => {
    try {
        const response = await axios.post('/api/tickets', ticketData, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error in createTicketFromChat:', error);
        throw error;
    }
};

export const extractTicketInfo = (conversationHistory, ticketOptions, userInfo) => {
    const ticketInfo = {
        title: '',
        description: '',
        category: '',
        priority: '',
        service: userInfo.service,
        location: '',
        company: userInfo.company,
        requester: userInfo.name,
        status: 'Nouveau'
    };

    // Fonction utilitaire pour nettoyer le texte
    const cleanText = (text) => text.toLowerCase().trim();

    // Fonction pour extraire le texte entre deux phrases
    const extractBetween = (text, start, end) => {
        const regex = new RegExp(`${start}(.*?)${end}`, 'i');
        const match = text.match(regex);
        return match ? match[1].trim() : '';
    };

    // Analyser l'historique de la conversation
    conversationHistory.forEach((message, index) => {
        if (message.role === 'assistant') {
            const content = cleanText(message.content);
            const userMessage = index > 0 ? cleanText(conversationHistory[index - 1].content) : '';

            // Extraction du titre
            if (content.includes('titre') && userMessage) {
                if (!userMessage.includes('titre') && !userMessage.includes('description')) {
                    ticketInfo.title = conversationHistory[index - 1].content.trim();
                }
            }

            // Extraction de la description
            if (content.includes('description') && userMessage) {
                if (!userMessage.includes('description') && !userMessage.includes('titre')) {
                    ticketInfo.description = conversationHistory[index - 1].content.trim();
                }
            }

            // Extraction de l'emplacement
            if (content.includes('emplacement') && userMessage && ticketOptions?.emplacements) {
                const matchingLocation = ticketOptions.emplacements.find(emp => 
                    cleanText(emp.nom).includes(userMessage) || userMessage.includes(cleanText(emp.nom))
                );
                if (matchingLocation) {
                    ticketInfo.location = matchingLocation.nom;
                }
            }

            // Extraction de la catégorie
            if (content.includes('catégorie') && ticketOptions?.categories) {
                const suggestedCategory = extractBetween(content, 'catégorie', 'avec');
                if (suggestedCategory) {
                    const matchingCategory = ticketOptions.categories.find(cat => 
                        cleanText(cat.nom).includes(cleanText(suggestedCategory))
                    );
                    if (matchingCategory) {
                        ticketInfo.category = matchingCategory.nom;
                    }
                }
            }

            // Extraction de la priorité
            if (content.includes('priorité') && ticketOptions?.priorites) {
                const suggestedPriority = extractBetween(content, 'priorité', 'êtes-vous');
                if (suggestedPriority) {
                    const matchingPriority = ticketOptions.priorites.find(pri => 
                        cleanText(pri.nom).includes(cleanText(suggestedPriority))
                    );
                    if (matchingPriority) {
                        ticketInfo.priority = matchingPriority.nom;
                    }
                }
            }
        }
    });

    // Validation des informations requises
    const missingFields = [];
    if (!ticketInfo.title) missingFields.push('titre');
    if (!ticketInfo.description) missingFields.push('description');
    if (!ticketInfo.category) missingFields.push('catégorie');
    if (!ticketInfo.priority) missingFields.push('priorité');
    if (!ticketInfo.location) missingFields.push('emplacement');

    // Si des champs sont manquants, les ajouter au ticketInfo pour le suivi
    if (missingFields.length > 0) {
        ticketInfo.missingFields = missingFields;
    }

    return ticketInfo;
}; 