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
    
    const maxRetries = 3;
    const retryDelay = 2000; // 2 secondes

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const attemptRequest = async (retryCount = 0) => {
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
            const requiredOptions = ['categories', 'emplacements', 'priorites'];
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

RÈGLES DE REFORMULATION :
1. Pour le titre :
   - Utiliser un langage professionnel et technique
   - Être concis mais descriptif (max 200 caractères)
   - Commencer par un verbe d'action au présent
   - Inclure le contexte technique si pertinent
   - Éviter les abréviations non standard
   - Exemple : "Résoudre problème de connexion VPN sur poste utilisateur"

2. Pour la description :
   - Écrire en un seul paragraphe fluide
   - Commencer par le contexte
   - Enchaîner avec la description du problème
   - Inclure les étapes de reproduction si applicable
   - Exemple :
     "L'utilisateur ne peut pas se connecter au VPN depuis son poste de travail. La connexion échoue avec l'erreur 'Authentication failed' après saisie des identifiants."

OPTIONS DISPONIBLES :
- Catégories : ${formatOptions(userInfo.ticketOptions.categories)}
- Emplacements : ${formatOptions(userInfo.ticketOptions.emplacements)}
- Priorités : ${formatOptions(userInfo.ticketOptions.priorites)}

ÉTAPES OBLIGATOIRES (à suivre dans l'ordre) :

1. COLLECTE DU TITRE
   - Demander un titre concis et descriptif
   - Reformuler le titre de manière professionnelle en suivant les règles ci-dessus
   - ATTENDRE sa validation
   - Passer à l'étape suivante

2. COLLECTE DE LA DESCRIPTION
   - Demander une description détaillée du problème
   - Reformuler la description de manière professionnelle en suivant les règles ci-dessus
   - ATTENDRE sa validation
   - Passer à l'étape suivante

3. COLLECTE DU COMMENTAIRE INITIAL
   - Demander un commentaire initial qui servira de suivi pour le ticket
   - Ce commentaire peut inclure des informations supplémentaires, des précisions ou des instructions spécifiques
   - ATTENDRE sa réponse
   - Passer à l'étape suivante

4. DÉTERMINATION DE LA CATÉGORIE
   - Afficher les catégories disponibles : ${formatOptions(userInfo.ticketOptions.categories)}
   - Demander à l'utilisateur de choisir une catégorie parmi celles listées
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

7. RÉSUMÉ ET DEMANDE DE CRÉATION
   - Présenter le résumé dans le format suivant :
     📋 RÉSUMÉ DU TICKET
     ──────────────────────────────
     📌 Titre : [titre reformulé]
     📝 Description : [description en un seul paragraphe]
     💬 Commentaire initial : [commentaire]
     🏷️ Catégorie : [catégorie]
     📍 Emplacement : [emplacement]
     ⚡ Priorité : [priorité]
     ──────────────────────────────
   - Demander si l'utilisateur souhaite procéder à la création du ticket
   - Si l'utilisateur répond "oui" :
     * Vérifier que toutes les informations sont présentes
     * Si des informations manquent, les demander à nouveau
     * Si toutes les informations sont présentes, indiquer que tu vas transmettre les informations pour la création

EXEMPLES DE RÉPONSES PROFESSIONNELLES :
- "Pour commencer, pourriez-vous me donner un titre concis qui décrit votre problème ? Je le reformulerai ensuite de manière professionnelle."
- "Merci pour le titre. Voici ma proposition de reformulation professionnelle : [titre reformulé]. Êtes-vous d'accord avec cette formulation ?"
- "Merci pour la description. Voici ma proposition de reformulation professionnelle : [description reformulée]. Cette formulation vous convient-elle ?"
- "Merci pour la description. Pourriez-vous ajouter un commentaire initial qui servira de suivi pour ce ticket ? Ce commentaire peut inclure des informations supplémentaires ou des instructions spécifiques."
- "Voici les catégories disponibles : ${formatOptions(userInfo.ticketOptions.categories)}. Quelle catégorie correspond le mieux à votre demande ?"
- "Voici les emplacements disponibles : ${formatOptions(userInfo.ticketOptions.emplacements)}. Quel est l'emplacement concerné ?"
- "Voici les priorités disponibles : ${formatOptions(userInfo.ticketOptions.priorites)}. Quelle priorité souhaitez-vous attribuer à ce ticket ?"
- "Je vais vérifier que toutes les informations sont présentes avant de procéder à la création du ticket."
- "Il manque certaines informations. Pourriez-vous me préciser [information manquante] ?"
- "Toutes les informations sont présentes. Je vais transmettre ces informations pour la création du ticket."

IMPORTANT : Tu DOIS TOUJOURS demander un commentaire initial après la description et avant de demander la catégorie. Ne saute JAMAIS cette étape.`;

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
            } else if (error.message.includes('overloaded') || error.message.includes('503')) {
                console.error('Erreur de surcharge du modèle');
                if (retryCount < maxRetries) {
                    console.log(`Tentative ${retryCount + 1}/${maxRetries} échouée. Nouvelle tentative dans ${retryDelay/1000} secondes...`);
                    await sleep(retryDelay);
                    return attemptRequest(retryCount + 1);
                }
                throw new Error('Le service est temporairement surchargé. Veuillez réessayer dans quelques instants.');
            } else {
                console.error('Erreur inattendue:', error);
                throw new Error('Une erreur est survenue lors de la communication avec l\'assistant. Veuillez réessayer.');
            }
        }
    };

    return attemptRequest();
};

export const extractTicketInfo = (conversationHistory, ticketOptions, userInfo) => {
    console.log('Options reçues:', ticketOptions);
    console.log('User info reçu:', userInfo);

    const ticketInfo = {
        title: '',
        description: '',
        commentaire: '',
        category: '',
        service: userInfo?.service?.designation || '',
        location: '',
        company: userInfo?.email ? userInfo.email.split('@')[1] : 'Non spécifiée',
        requester: userInfo?.designation || 'Non spécifié',
        status: 'Nouveau',
        priority: '',
        startDate: '',
        endDate: '',
        createdAt: new Date().toISOString(),
        id_utilisateur: userInfo?.id || 1,
        id_societe: userInfo?.id_societe || 1,
        id_emplacement: null,
        id_priorite: null,
        id_categorie: null,
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

    // Fonction pour extraire une valeur après un émoji
    const extractValue = (text, emoji) => {
        // Regex pour extraire la valeur après l'émoji jusqu'à la fin de la ligne ou le prochain émoji
        const regex = new RegExp(`${emoji}\\s*([^\\n📌📝💬🏷️📍⚡📅]+)`, 'i');
        const match = text.match(regex);
        if (!match) return null;
        
        // Nettoyer la valeur extraite
        let value = match[1].trim();
        
        // Supprimer les labels communs et les deux-points
        value = value.replace(/^(Titre|Description|Commentaire initial|Catégorie|Emplacement|Priorité|Date de début|Date de fin)\s*:\s*/i, '');
        value = value.replace(/^:\s*/, ''); // Supprimer les deux-points au début
        
        return value;
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
                ticketInfo.title = extractValue(content, '📌');
                console.log('Titre extrait:', ticketInfo.title);

                // Extraire la description
                ticketInfo.description = extractValue(content, '📝');
                console.log('Description extraite:', ticketInfo.description);

                // Extraire le commentaire
                ticketInfo.commentaire = extractValue(content, '💬');
                console.log('Commentaire extrait:', ticketInfo.commentaire);

                // Extraire la catégorie
                ticketInfo.category = extractValue(content, '🏷️');
                ticketInfo.id_categorie = findIdByDesignation(ticketInfo.category, ticketOptions.categories);
                console.log('Catégorie extraite:', ticketInfo.category, 'ID:', ticketInfo.id_categorie);

                // Extraire l'emplacement
                ticketInfo.location = extractValue(content, '📍');
                ticketInfo.id_emplacement = findIdByDesignation(ticketInfo.location, ticketOptions.emplacements);
                console.log('Emplacement extrait:', ticketInfo.location, 'ID:', ticketInfo.id_emplacement);

                // Extraire la priorité
                ticketInfo.priority = extractValue(content, '⚡');
                ticketInfo.id_priorite = findIdByDesignation(ticketInfo.priority, ticketOptions.priorites);
                console.log('Priorité extraite:', ticketInfo.priority, 'ID:', ticketInfo.id_priorite);

                // Extraire les dates
                const startDate = extractValue(content, '📅 Date de début');
                const endDate = extractValue(content, '📅 Date de fin');
                
                if (startDate) {
                    // Convertir la date au format YYYY-MM-DD
                    const [day, month, year] = startDate.split('/');
                    ticketInfo.startDate = `${year}-${month}-${day}`;
                    console.log('Date de début extraite:', ticketInfo.startDate);
                }
                if (endDate) {
                    // Convertir la date au format YYYY-MM-DD
                    const [day, month, year] = endDate.split('/');
                    ticketInfo.endDate = `${year}-${month}-${day}`;
                    console.log('Date de fin extraite:', ticketInfo.endDate);
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
        if (!ticketData.title || !ticketData.description ||
            !ticketData.id_categorie || !ticketData.id_emplacement || !ticketData.id_priorite) {
            console.error('Données manquantes:', {
                title: ticketData.title,
                description: ticketData.description,
                id_categorie: ticketData.id_categorie,
                id_emplacement: ticketData.id_emplacement,
                id_priorite: ticketData.id_priorite
            });
            throw new Error('Données de ticket incomplètes');
        }

        // Vérifier que l'ID de l'utilisateur est valide
        const currentUser = JSON.parse(localStorage.getItem('user'));
        if (!currentUser || !currentUser.id) {
            console.error('Utilisateur non connecté ou ID invalide');
            throw new Error('Vous devez être connecté pour créer un ticket.');
        }
        ticketData.id_utilisateur = currentUser.id;
        ticketData.id_demandeur = currentUser.id;

        // Transformer les données en format attendu par l'API
        const transformedData = {
            titre: ticketData.title,
            description: ticketData.description,
            commentaire: ticketData.commentaire || ticketData.description,
            id_demandeur: ticketData.id_demandeur,
            id_utilisateur: ticketData.id_utilisateur,
            id_societe: ticketData.id_societe,
            id_emplacement: ticketData.id_emplacement,
            id_priorite: ticketData.id_priorite,
            id_categorie: ticketData.id_categorie,
            id_statut: ticketData.id_statut,
            id_executant: ticketData.id_executant
        };
        if (ticketData.startDate) {
            transformedData.date_debut = ticketData.startDate;
        }
        if (ticketData.endDate) {
            transformedData.date_fin_prevue = ticketData.endDate;
        }

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

const formatTicketInfo = (ticket) => {
    return `
      <ticket>
        <id>${ticket.id}</id>
        <titre>${ticket.titre}</titre>
        <description>${ticket.description}</description>
        <priorite>${ticket.priorite?.designation || 'Non définie'}</priorite>
        <statut>${ticket.statut?.designation || 'Non défini'}</statut>
        <categorie>${ticket.categorie?.designation || 'Non définie'}</categorie>
        <emplacement>${ticket.emplacement?.designation || 'Non défini'}</emplacement>
        <societe>${ticket.societe?.designation || 'Non définie'}</societe>
        <demandeur>${ticket.demandeur?.nom || 'Non défini'}</demandeur>
        <executant>${ticket.executant?.nom || 'Non défini'}</executant>
        <date_creation>${ticket.DateCreation}</date_creation>
        <date_fin_prevue>${ticket.DateFinPrevue}</date_fin_prevue>
        <date_fin_reelle>${ticket.DateFinReelle || 'Non définie'}</date_fin_reelle>
      </ticket>
    `;
};