import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

const API_KEY = 'AIzaSyCSZo6wMOi8s3mzCrjt-xZr4U-36U--bCo';

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

        // Vérification des options de ticket
        if (!userInfo?.ticketOptions) {
            throw new Error('Les options de ticket ne sont pas disponibles. Veuillez rafraîchir la page.');
        }

        // Vérification que toutes les options nécessaires sont présentes
        const requiredOptions = ['categories', 'types', 'emplacements', 'priorites'];
        const missingOptions = requiredOptions.filter(option => !userInfo.ticketOptions[option]?.length);
        
        if (missingOptions.length > 0) {
            throw new Error(`Les options suivantes ne sont pas disponibles : ${missingOptions.join(', ')}. Veuillez rafraîchir la page.`);
        }

        // Fonction utilitaire pour formater les options
        const formatOptions = (options) => {
            if (!options || !Array.isArray(options)) return '';
            return options.map(opt => opt.designation || '').filter(Boolean).join(', ');
        };

        // Définition du SYSTEM_PROMPT avec les informations de l'utilisateur et les options disponibles
        const SYSTEM_PROMPT = `Tu es un assistant professionnel spécialisé dans la création de tickets de support IT.
Ton rôle est de guider les utilisateurs de manière professionnelle et efficace dans la création de leurs tickets.

RÈGLES STRICTES DE CONVERSATION :
1. Tu DOIS suivre l'ordre exact des étapes ci-dessous
2. Tu DOIS poser UNE SEULE question à la fois
3. Tu DOIS attendre la réponse de l'utilisateur avant de poser la question suivante
4. Tu DOIS vérifier que chaque information est complète avant de passer à l'étape suivante
5. Tu NE DOIS PAS proposer de créer le ticket avant d'avoir toutes les informations requises
6. Tu DOIS utiliser UNIQUEMENT les options fournies dans le contexte pour chaque choix
7. Tu NE DOIS JAMAIS demander les informations suivantes car elles sont déjà connues :
   - Le demandeur (${userInfo.designation || 'Non spécifié'})
   - La société (${userInfo.email?.split('@')[1] || 'Non spécifiée'})
   - La date de création (automatique)
8. Tu NE DOIS JAMAIS confirmer la création du ticket - ce n'est pas ton rôle
9. À la fin, tu DOIS UNIQUEMENT demander si l'utilisateur souhaite procéder à la création du ticket
10. Si l'utilisateur répond "oui" à la création, tu DOIS :
    - Vérifier que toutes les informations sont présentes
    - Si des informations manquent, les demander à nouveau
    - Si toutes les informations sont présentes, indiquer que tu vas transmettre les informations pour la création

OPTIONS DISPONIBLES :
- Catégories : ${formatOptions(userInfo.ticketOptions.categories)}
- Types : ${formatOptions(userInfo.ticketOptions.types)}
- Emplacements : ${formatOptions(userInfo.ticketOptions.emplacements)}
- Priorités : ${formatOptions(userInfo.ticketOptions.priorites)}

ÉTAPES OBLIGATOIRES (à suivre dans l'ordre) :

1. COLLECTE DU TITRE
   - Demander un titre concis et descriptif
   - ATTENDRE sa réponse
   - Passer à l'étape suivante

2. COLLECTE DE LA DESCRIPTION
   - Demander une description détaillée du problème
   - ATTENDRE sa réponse
   - Passer à l'étape suivante

3. DÉTERMINATION DE LA CATÉGORIE
   - Afficher les catégories disponibles : ${formatOptions(userInfo.ticketOptions.categories)}
   - Demander à l'utilisateur de choisir une catégorie parmi celles listées
   - ATTENDRE sa réponse
   - Passer à l'étape suivante

4. DÉTERMINATION DU TYPE DE DEMANDE
   - Afficher les types disponibles : ${formatOptions(userInfo.ticketOptions.types)}
   - Demander à l'utilisateur de choisir un type parmi ceux listés
   - ATTENDRE sa réponse
   - Passer à l'étape suivante

5. COLLECTE DE L'EMPLACEMENT
   - Afficher les emplacements disponibles : ${formatOptions(userInfo.ticketOptions.emplacements)}
   - Demander à l'utilisateur de choisir un emplacement parmi ceux listés
   - ATTENDRE sa réponse
   - Passer à l'étape suivante

6. DÉTERMINATION DE LA PRIORITÉ
   - Afficher les priorités disponibles : ${formatOptions(userInfo.ticketOptions.priorites)}
   - Demander à l'utilisateur de choisir une priorité parmi celles listées
   - ATTENDRE sa réponse
   - Passer à l'étape suivante

7. COLLECTE DES DATES
   - Demander la date de début prévue
   - ATTENDRE sa réponse
   - Demander la date de fin prévue
   - ATTENDRE sa réponse
   - Passer à l'étape suivante

8. RÉSUMÉ ET DEMANDE DE CRÉATION
   - Présenter le résumé dans le format suivant :
     📋 RÉSUMÉ DU TICKET
     ──────────────────────────────
     📌 Titre : [titre]
     📝 Description : [description]
     🏷️ Catégorie : [catégorie]
     📋 Type : [type]
     📍 Emplacement : [emplacement]
     ⚡ Priorité : [priorité]
     📅 Date de début : [date début]
     📅 Date de fin : [date fin]
     ──────────────────────────────
   - Demander si l'utilisateur souhaite procéder à la création du ticket
   - Si l'utilisateur répond "oui" :
     * Vérifier que toutes les informations sont présentes
     * Si des informations manquent, les demander à nouveau
     * Si toutes les informations sont présentes, indiquer que tu vas transmettre les informations pour la création

EXEMPLES DE RÉPONSES PROFESSIONNELLES :
- "Pour commencer, pourriez-vous me donner un titre concis qui décrit votre problème ?"
- "Merci pour le titre. Maintenant, pourriez-vous me donner une description détaillée du problème ?"
- "Voici les catégories disponibles : ${formatOptions(userInfo.ticketOptions.categories)}. Quelle catégorie correspond le mieux à votre demande ?"
- "Voici les types disponibles : ${formatOptions(userInfo.ticketOptions.types)}. Quel type de demande souhaitez-vous créer ?"
- "Voici les emplacements disponibles : ${formatOptions(userInfo.ticketOptions.emplacements)}. Quel est l'emplacement concerné ?"
- "Voici les priorités disponibles : ${formatOptions(userInfo.ticketOptions.priorites)}. Quelle priorité souhaitez-vous attribuer à ce ticket ?"
- "Quelle est la date de début prévue pour ce ticket ?"
- "Quelle est la date de fin prévue pour ce ticket ?"
- "Je vais vérifier que toutes les informations sont présentes avant de procéder à la création du ticket."
- "Il manque certaines informations. Pourriez-vous me préciser [information manquante] ?"
- "Toutes les informations sont présentes. Je vais transmettre ces informations pour la création du ticket."`;

        console.warn('Construction du contexte de conversation');
        // Construire le contexte de la conversation
        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: SYSTEM_PROMPT,
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

export const extractTicketInfo = (conversationHistory, ticketOptions, userInfo) => {
    console.log('Options reçues:', ticketOptions);
    console.log('User info reçu:', userInfo);

    const ticketInfo = {
        title: '',
        description: '',
        category: '',
        type: '',
        service: userInfo.niveau === 1 ? 'Administration' : userInfo.niveau === 2 ? 'Demandeur' : 'Support',
        location: '',
        company: userInfo.email.split('@')[1] || 'Non spécifiée',
        requester: userInfo.designation,
        status: 'Nouveau',
        priority: '',
        startDate: '',
        endDate: '',
        createdAt: new Date().toISOString(),
        id_utilisateur: userInfo.id || 1,
        id_societe: userInfo.id_societe || 1,
        id_emplacement: null,
        id_priorite: null,
        id_categorie: null,
        id_type_demande: null,
        id_statut: 1,
        id_executant: 1
    };

    // Fonction utilitaire pour nettoyer le texte
    const cleanText = (text) => text.toLowerCase().trim();

    // Fonction pour trouver l'ID correspondant à une désignation
    const findIdByDesignation = (designation, options) => {
        if (!designation || !options) return null;
        console.log('Recherche ID pour:', designation, 'dans les options:', options);

        // Nettoyer la désignation pour la comparaison
        const cleanDesignation = cleanText(designation);

        // Fonction pour normaliser le texte (enlever accents et caractères spéciaux)
        const normalizeText = (text) => {
            return text
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
                .replace(/[^a-z0-9]/g, '') // Enlever les caractères spéciaux
                .toLowerCase();
        };

        // Essayer différentes méthodes de correspondance
        let option = null;

        // 1. Correspondance exacte
        option = options.find(opt => cleanText(opt.designation) === cleanDesignation);
        if (option) {
            console.log('Correspondance exacte trouvée:', option);
            return option.id;
        }

        // 2. Correspondance normalisée
        const normalizedDesignation = normalizeText(cleanDesignation);
        option = options.find(opt => normalizeText(opt.designation) === normalizedDesignation);
        if (option) {
            console.log('Correspondance normalisée trouvée:', option);
            return option.id;
        }

        // 3. Correspondance partielle
        option = options.find(opt => {
            const optText = cleanText(opt.designation);
            return optText.includes(cleanDesignation) || cleanDesignation.includes(optText);
        });
        if (option) {
            console.log('Correspondance partielle trouvée:', option);
            return option.id;
        }

        // 4. Correspondance avec similarité
        option = options.find(opt => {
            const optText = normalizeText(opt.designation);
            const similarity = calculateSimilarity(normalizedDesignation, optText);
            return similarity > 0.8; // Seuil de similarité de 80%
        });
        if (option) {
            console.log('Correspondance par similarité trouvée:', option);
            return option.id;
        }

        console.log('Aucune correspondance trouvée pour:', designation);
        return null;
    };

    // Fonction pour calculer la similarité entre deux chaînes
    const calculateSimilarity = (str1, str2) => {
        if (str1.length === 0 || str2.length === 0) return 0;
        if (str1 === str2) return 1;

        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 1.0;

        return (longer.length - editDistance(longer, shorter)) / parseFloat(longer.length);
    };

    // Fonction pour calculer la distance d'édition (Levenshtein)
    const editDistance = (str1, str2) => {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1, // suppression
                    matrix[j - 1][i] + 1, // insertion
                    matrix[j - 1][i - 1] + substitutionCost // substitution
                );
            }
        }

        return matrix[str2.length][str1.length];
    };

    // Fonction pour extraire une valeur entre deux émojis
    const extractValue = (text, startEmoji, endEmoji) => {
        // Pour le type, utiliser une regex plus spécifique
        if (startEmoji === '📋') {
            const typeMatch = text.match(/📋 Type : (Projet|Incident|Demande|Problème)/i);
            return typeMatch ? typeMatch[1].trim() : '';
        }
        
        // Pour les autres champs, utiliser la regex standard
        const regex = new RegExp(`${startEmoji}[^:]*:\\s*([^${endEmoji}]+)`, 'i');
        const match = text.match(regex);
        return match ? match[1].trim() : '';
    };

    // Analyser l'historique de la conversation
    conversationHistory.forEach((message, index) => {
        if (message.role === 'assistant') {
            const content = message.content;
            console.log('Analyse du message:', content);

            // Vérifier si c'est un message de résumé
            if (content.includes('📋 RÉSUMÉ DU TICKET')) {
                console.log('Résumé de ticket trouvé');

                // Extraire le titre
                ticketInfo.title = extractValue(content, '📌', '📝');
                console.log('Titre extrait:', ticketInfo.title);

                // Extraire la description
                ticketInfo.description = extractValue(content, '📝', '🏷️');
                console.log('Description extraite:', ticketInfo.description);

                // Extraire la catégorie
                ticketInfo.category = extractValue(content, '🏷️', '📋');
                ticketInfo.id_categorie = findIdByDesignation(ticketInfo.category, ticketOptions.categories);
                console.log('Catégorie extraite:', ticketInfo.category, 'ID:', ticketInfo.id_categorie);

                // Extraire le type
                ticketInfo.type = extractValue(content, '📋', '📍');
                if (!ticketInfo.type) {
                    // Si l'extraction échoue, essayer de trouver le type dans le texte complet
                    const typeMatch = content.match(/Type : (Projet|Incident|Demande|Problème)/i);
                    if (typeMatch) {
                        ticketInfo.type = typeMatch[1].trim();
                    }
                }
                ticketInfo.id_type_demande = findIdByDesignation(ticketInfo.type, ticketOptions.types);
                console.log('Type extrait:', ticketInfo.type, 'ID:', ticketInfo.id_type_demande);

                // Extraire l'emplacement
                ticketInfo.location = extractValue(content, '📍', '⚡');
                ticketInfo.id_emplacement = findIdByDesignation(ticketInfo.location, ticketOptions.emplacements);
                console.log('Emplacement extrait:', ticketInfo.location, 'ID:', ticketInfo.id_emplacement);

                // Extraire la priorité
                ticketInfo.priority = extractValue(content, '⚡', '📅');
                ticketInfo.id_priorite = findIdByDesignation(ticketInfo.priority, ticketOptions.priorites);
                console.log('Priorité extraite:', ticketInfo.priority, 'ID:', ticketInfo.id_priorite);

                // Extraire les dates
                const dates = content.match(/📅 Date de (début|fin) : (\d{2}\/\d{2}\/\d{4})/g);
                if (dates) {
                    dates.forEach(dateStr => {
                        const [type, date] = dateStr.match(/📅 Date de (début|fin) : (\d{2}\/\d{2}\/\d{4})/).slice(1);
                        if (type === 'début') {
                            ticketInfo.startDate = date;
                            console.log('Date de début extraite:', ticketInfo.startDate);
                        } else {
                            ticketInfo.endDate = date;
                            console.log('Date de fin extraite:', ticketInfo.endDate);
                        }
                    });
                }
            }
        }
    });

    console.log('Ticket info final:', ticketInfo);
    return ticketInfo;
};

export const createTicketFromChat = async (ticketData) => {
    try {
        const token = localStorage.getItem('token');
        
        // Vérifier que toutes les données requises sont présentes
        if (!ticketData.title || !ticketData.description || !ticketData.startDate || !ticketData.endDate ||
            !ticketData.id_categorie || !ticketData.id_emplacement || !ticketData.id_priorite || !ticketData.id_type_demande) {
            console.error('Données manquantes:', {
                title: ticketData.title,
                description: ticketData.description,
                startDate: ticketData.startDate,
                endDate: ticketData.endDate,
                id_categorie: ticketData.id_categorie,
                id_emplacement: ticketData.id_emplacement,
                id_priorite: ticketData.id_priorite,
                id_type_demande: ticketData.id_type_demande
            });
            throw new Error('Données de ticket incomplètes');
        }

        // Vérifier que l'ID de l'utilisateur est valide
        if (!ticketData.id_utilisateur || ticketData.id_utilisateur <= 0) {
            console.error('ID utilisateur invalide:', ticketData.id_utilisateur);
            throw new Error('ID utilisateur invalide. Veuillez vous reconnecter.');
        }

        // Transformer les données en format attendu par l'API
        const transformedData = {
            titre: ticketData.title,
            description: ticketData.description,
            date_debut: ticketData.startDate,
            date_fin_prevue: ticketData.endDate,
            date_fin_reelle: '',
            id_demandeur: ticketData.id_utilisateur,
            id_utilisateur: ticketData.id_utilisateur,
            id_societe: ticketData.id_societe,
            id_emplacement: ticketData.id_emplacement,
            id_priorite: ticketData.id_priorite,
            id_categorie: ticketData.id_categorie,
            id_type_demande: ticketData.id_type_demande,
            id_statut: ticketData.id_statut,
            id_executant: ticketData.id_executant
        };

        console.log('Données envoyées à l\'API:', transformedData);

        // Vérifier si le token est présent
        if (!token) {
            throw new Error('Token d\'authentification manquant. Veuillez vous reconnecter.');
        }

        const response = await axios.post('/api/tickets', transformedData, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error in createTicketFromChat:', error);
        
        // Gestion spécifique des erreurs
        if (error.response?.status === 422) {
            const validationErrors = error.response.data.errors;
            if (validationErrors.id_demandeur) {
                throw new Error('Erreur d\'authentification. Veuillez vous reconnecter.');
            }
            // Afficher les autres erreurs de validation
            const errorMessages = Object.entries(validationErrors)
                .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
                .join('\n');
            throw new Error(`Erreurs de validation:\n${errorMessages}`);
        } else if (error.response?.status === 401) {
            throw new Error('Session expirée. Veuillez vous reconnecter.');
        } else if (error.response?.status === 403) {
            throw new Error('Vous n\'avez pas les permissions nécessaires pour créer un ticket.');
        } else {
            throw new Error('Une erreur est survenue lors de la création du ticket. Veuillez réessayer.');
        }
    }
};