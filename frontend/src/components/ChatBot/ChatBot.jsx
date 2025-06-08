import React, { useState, useRef, useEffect } from 'react';
import { chatWithGemini, createTicketFromChat, extractTicketInfo } from '../../utils/chatbotService';
import Layout from '../Layout';
import axios from '../../utils/axios';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { fr } from 'date-fns/locale';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ChatBot = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [ticketData, setTicketData] = useState(null);
    const [ticketOptions, setTicketOptions] = useState(null);
    const [error, setError] = useState(null);
    const [userInfo, setUserInfo] = useState(null);
    const [showCategories, setShowCategories] = useState(false);
    const [showLocations, setShowLocations] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dateType, setDateType] = useState(null); // 'start' ou 'end'
    const [attachments, setAttachments] = useState([]);
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Récupérer les informations de l'utilisateur
                const userResponse = await axios.get('/api/user');
                setUserInfo(userResponse.data);

                // Récupérer les options de ticket
                const optionsResponse = await axios.get('/api/tickets/options');
                console.log('Options reçues du backend:', optionsResponse.data);
                
                if (optionsResponse.data.hasErrors) {
                    console.error('Erreurs lors de la récupération des options:', optionsResponse.data.errors);
                    setError('Erreur lors du chargement des options. Veuillez rafraîchir la page.');
                    return;
                }

                const options = optionsResponse.data.options;
                // Vérifier que toutes les options requises sont présentes
                const requiredOptions = ['categories', 'emplacements'];
                const missingOptions = requiredOptions.filter(option => !options[option]?.length);
                
                if (missingOptions.length > 0) {
                    console.error('Options manquantes:', missingOptions);
                    setError(`Les options suivantes ne sont pas disponibles : ${missingOptions.join(', ')}. Veuillez rafraîchir la page.`);
                    return;
                }

                setTicketOptions(options);
            } catch (error) {
                console.error('Erreur lors du chargement des données:', error);
                setError('Erreur lors du chargement des données. Veuillez rafraîchir la page.');
            }
        };
        fetchData();
    }, []);

    const initializeChat = () => {
        setMessages([
            {
                role: 'assistant',
                content: "Bonjour ! Je suis votre assistant pour la création de tickets. Je vais vous guider à travers le processus de création d'un ticket. Comment puis-je vous aider aujourd'hui ?"
            }
        ]);
    };

    useEffect(() => {
        initializeChat();
    }, []);

    const handleOptionSelect = (option, type) => {
        switch (type) {
            case 'category':
                setShowCategories(false);
                break;
            case 'location':
                setShowLocations(false);
                break;
        }
        const userMessage = option.designation;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);
        setError(null);

        // Préparer le contexte avec les options disponibles
        const contextWithOptions = {
            ...userInfo,
            ticketOptions: {
                categories: ticketOptions.categories || [],
                emplacements: ticketOptions.emplacements || []
            }
        };

        // Envoyer le message directement
        chatWithGemini(userMessage, messages, contextWithOptions)
            .then(response => {
                // Vérifier le type de demande dans la réponse
                const lowerResponse = response.toLowerCase();
                setShowCategories(lowerResponse.includes('catégorie'));
                setShowLocations(lowerResponse.includes('emplacement'));
                
                // Vérifier si la réponse contient plusieurs questions
                const questions = response.split('?').filter(q => q.trim().length > 0);
                
                // Vérifier si la dernière question est similaire à la précédente
                const lastMessage = messages[messages.length - 1];
                const isRepeatedQuestion = lastMessage && 
                    lastMessage.role === 'assistant' && 
                    lastMessage.content.toLowerCase() === response.toLowerCase();

                if (!isRepeatedQuestion) {
                    if (questions.length > 1) {
                        // Si plusieurs questions, ne garder que la première
                        const firstQuestion = questions[0] + '?';
                        setMessages(prev => [...prev, { role: 'assistant', content: firstQuestion }]);
                    } else {
                        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
                    }
                }

                // Vérifier si la réponse contient un résumé de ticket
                if (response.includes('📋 RÉSUMÉ DU TICKET')) {
                    const extractedInfo = extractTicketInfo(
                        [...messages, { role: 'user', content: userMessage }, { role: 'assistant', content: response }], 
                        ticketOptions, 
                        userInfo
                    );
                    console.log('Informations extraites du résumé:', extractedInfo);
                    setTicketData(extractedInfo);
                    // Fermer tous les sélecteurs après le résumé
                    setShowCategories(false);
                    setShowLocations(false);
                    // Ajouter le résumé du ticket dans les messages
                    setMessages(prev => [...prev, { 
                        role: 'assistant', 
                        content: 'Voici le résumé de votre ticket :',
                        component: renderTicketSummary(extractedInfo)
                    }]);
                }
            })
            .catch(error => {
                const errorMessage = error.message || "Une erreur est survenue. Veuillez réessayer.";
                setError(errorMessage);
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: errorMessage
                }]);
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    const renderOptionTable = (options, type, title) => {
        if (!options || options.length === 0) return null;

        const getTableStyle = () => {
            switch (type) {
                case 'category':
                    return 'bg-blue-50 hover:bg-blue-100 text-blue-800';
                case 'location':
                    return 'bg-green-50 hover:bg-green-100 text-green-800';
                default:
                    return 'bg-gray-50 hover:bg-gray-100 text-gray-800';
            }
        };

        return (
            <div className="mt-4 p-4 bg-white rounded-lg shadow-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4 text-gray-700">{title}</h3>
                <div className="grid grid-cols-2 gap-4">
                    {options.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => handleOptionSelect(option, type)}
                            className={`p-4 rounded-lg transition-all duration-200 ${getTableStyle()} 
                                     flex items-center justify-center text-center font-medium
                                     transform hover:scale-105 hover:shadow-md`}
                        >
                            {option.designation}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const renderCategories = () => {
        if (!showCategories || !ticketOptions?.categories) return null;
        return renderOptionTable(ticketOptions.categories, 'category', 'Sélectionnez une catégorie :');
    };

    const renderLocations = () => {
        if (!showLocations || !ticketOptions?.emplacements) return null;
        return renderOptionTable(ticketOptions.emplacements, 'location', 'Sélectionnez un emplacement :');
    };

    const renderTicketSummary = (ticketData) => {
        if (!ticketData) return null;

        // Affichage des pièces jointes
        let attachments = [];
        let attachmentsBlock = null;
        try {
            let raw = ticketData.attachment_path;
            if (typeof raw === 'string') {
                attachments = JSON.parse(raw);
                // Si le premier élément est encore une string JSON, parse-le aussi
                if (
                    Array.isArray(attachments) &&
                    attachments.length === 1 &&
                    typeof attachments[0] === 'string' &&
                    attachments[0].includes('[')
                ) {
                    attachments = JSON.parse(attachments[0]);
                }
            }
        } catch (e) {
            attachments = [];
        }
        console.log('attachment_path brut:', ticketData.attachment_path);
        console.log('attachments après parse:', attachments);
        if (Array.isArray(attachments) && attachments.length > 0) {
            attachmentsBlock = (
                <div className="mt-2">
                    <strong>Pièces jointes :</strong>
                    <ul>
                        {attachments.map((url, idx) => {
                            // Nettoyage du nom de fichier
                            const cleanName = url.split('/').pop().replace(/^[\s"'\[\]]+|[\s"'\[\]]+$/g, '').trim();
                            return (
                                <li key={idx}>
                                    <a href={`/api/tickets/${ticketData.id}/download/${idx}`} target="_blank" rel="noopener noreferrer">
                                        {cleanName}
                                    </a>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            );
        }

        return (
            <div className="mt-4 p-4 bg-white rounded-lg shadow-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4 text-gray-700">📋 RÉSUMÉ DU TICKET</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white">
                        <tbody className="divide-y divide-gray-200">
                            <tr>
                                <td className="px-4 py-2 text-sm font-medium text-gray-600 w-1/3">Titre</td>
                                <td className="px-4 py-2 text-sm text-gray-800">{ticketData.title || '-'}</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-2 text-sm font-medium text-gray-600">Description</td>
                                <td className="px-4 py-2 text-sm text-gray-800">{ticketData.description || '-'}</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-2 text-sm font-medium text-gray-600">Catégorie</td>
                                <td className="px-4 py-2 text-sm text-gray-800">{ticketData.category || '-'}</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-2 text-sm font-medium text-gray-600">Emplacement</td>
                                <td className="px-4 py-2 text-sm text-gray-800">{ticketData.location || '-'}</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-2 text-sm font-medium text-gray-600">Statut</td>
                                <td className="px-4 py-2 text-sm text-gray-800">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                        ${ticketData.status === 'Nouveau' ? 'bg-blue-100 text-blue-800' :
                                        ticketData.status === 'En cours' ? 'bg-yellow-100 text-yellow-800' :
                                        ticketData.status === 'Terminé' ? 'bg-green-100 text-green-800' :
                                        'bg-gray-100 text-gray-800'}`}>
                                        {ticketData.status || '-'}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td className="px-4 py-2 text-sm font-medium text-gray-600">Demandeur</td>
                                <td className="px-4 py-2 text-sm text-gray-800">{ticketData.requester || '-'}</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-2 text-sm font-medium text-gray-600">Service</td>
                                <td className="px-4 py-2 text-sm text-gray-800">{ticketData.service || '-'}</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-2 text-sm font-medium text-gray-600">Commentaire</td>
                                <td className="px-4 py-2 text-sm text-gray-800">{ticketData.commentaire || '-'}</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-2 text-sm font-medium text-gray-600">Pièces jointes</td>
                                <td className="px-4 py-2 text-sm text-gray-600">
                                    {attachmentsBlock || (attachments && attachments.length > 0 ? attachments.map(f => f.name).join(', ') : '-')}
                                </td>
                                <td className="px-4 py-2 text-center">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${attachmentsBlock ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{attachmentsBlock ? '✓' : '-'}</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                {attachmentsBlock}
            </div>
        );
    };

    const handleFileChange = (event) => {
        const files = Array.from(event.target.files);
        const validFiles = files.filter(file => {
            const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
                              'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                              'image/jpeg', 'image/png'];
            const maxSize = 10 * 1024 * 1024; // 10 Mo
            
            if (!validTypes.includes(file.type)) {
                toast.error(`Le fichier ${file.name} n'est pas d'un type accepté. Types acceptés : PDF, DOC, DOCX, XLS, XLSX, JPG, PNG`);
                return false;
            }
            
            if (file.size > maxSize) {
                toast.error(`Le fichier ${file.name} dépasse la taille maximale de 10 Mo`);
                return false;
            }
            
            return true;
        });

        if (validFiles.length > 0) {
            setAttachments(prev => [...prev, ...validFiles]);
            toast.success(`${validFiles.length} fichier(s) ajouté(s) avec succès`);
        }
    };

    const removeAttachment = (index) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const renderAttachments = () => {
        if (attachments.length === 0) return null;

        return (
            <div className="mt-4 p-4 bg-white rounded-lg shadow-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4 text-gray-700">Pièces jointes</h3>
                <div className="space-y-2">
                    {attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm text-gray-600">{file.name}</span>
                            <button
                                onClick={() => removeAttachment(index)}
                                className="text-red-500 hover:text-red-700"
                            >
                                Supprimer
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || !userInfo || !ticketOptions) {
            toast.error('Veuillez attendre le chargement des données avant de continuer.');
            return;
        }

        // Vérifier que toutes les options requises sont présentes
        const requiredOptions = ['categories', 'emplacements'];
        const missingOptions = requiredOptions.filter(option => !ticketOptions[option]?.length);
        
        if (missingOptions.length > 0) {
            toast.error(`Les options suivantes ne sont pas disponibles : ${missingOptions.join(', ')}. Veuillez rafraîchir la page.`);
            return;
        }

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);
        setError(null);

        try {
            // Préparer le contexte avec les options disponibles
            const contextWithOptions = {
                ...userInfo,
                ticketOptions: {
                    categories: ticketOptions.categories || [],
                    emplacements: ticketOptions.emplacements || []
                }
            };

            console.log('Options envoyées au chat:', contextWithOptions.ticketOptions);

            const response = await chatWithGemini(userMessage, messages, contextWithOptions);
            
            // Vérifier le type de demande dans la réponse
            const lowerResponse = response.toLowerCase();
            setShowCategories(lowerResponse.includes('catégorie'));
            setShowLocations(lowerResponse.includes('emplacement'));
            
            // Vérifier si la réponse contient plusieurs questions
            const questions = response.split('?').filter(q => q.trim().length > 0);
            
            // Vérifier si la dernière question est similaire à la précédente
            const lastMessage = messages[messages.length - 1];
            const isRepeatedQuestion = lastMessage && 
                lastMessage.role === 'assistant' && 
                lastMessage.content.toLowerCase() === response.toLowerCase();

            if (!isRepeatedQuestion) {
                if (questions.length > 1) {
                    // Si plusieurs questions, ne garder que la première
                    const firstQuestion = questions[0] + '?';
                    setMessages(prev => [...prev, { role: 'assistant', content: firstQuestion }]);
                } else {
                    setMessages(prev => [...prev, { role: 'assistant', content: response }]);
                }
            }

            // Vérifier si la réponse contient un résumé de ticket
            if (response.includes('📋 RÉSUMÉ DU TICKET')) {
                const extractedInfo = extractTicketInfo(
                    [...messages, { role: 'user', content: userMessage }, { role: 'assistant', content: response }], 
                    ticketOptions, 
                    userInfo
                );
                console.log('Informations extraites du résumé:', extractedInfo);
                setTicketData(extractedInfo);
                // Ajouter le résumé du ticket dans les messages
                setMessages(prev => [...prev, { 
                    role: 'assistant', 
                    content: 'Voici le résumé de votre ticket :',
                    component: renderTicketSummary(extractedInfo)
                }]);
            }

            // Si l'utilisateur a répondu "oui" à la création du ticket
            if (userMessage.toLowerCase() === 'oui' && response.includes('Toutes les informations sont présentes')) {
                if (ticketData) {
                    handleCreateTicket();
                }
            }
        } catch (error) {
            const errorMessage = error.message || "Une erreur est survenue. Veuillez réessayer.";
            setError(errorMessage);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: errorMessage
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateTicket = async () => {
        if (!ticketData) return;

        // Ajout du log pour debug
        console.log('TicketData envoyé à l\'API:', ticketData);

        // Vérification des champs essentiels
        if (
            !ticketData.title ||
            !ticketData.description ||
            !ticketData.id_categorie ||
            !ticketData.id_emplacement
        ) {
            toast.error("Veuillez compléter toutes les informations du ticket avant de le créer.");
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            // Créer un objet FormData pour envoyer les fichiers
            const formData = new FormData();
            // Ajouter les données du ticket avec les bons noms pour l'API
            formData.append('titre', ticketData.title);
            formData.append('description', ticketData.description);
            formData.append('commentaire', ticketData.commentaire || ticketData.description);
            formData.append('id_demandeur', ticketData.id_utilisateur);
            formData.append('id_utilisateur', ticketData.id_utilisateur);
            formData.append('id_societe', ticketData.id_societe);
            formData.append('id_emplacement', ticketData.id_emplacement);
            formData.append('id_categorie', ticketData.id_categorie);
            formData.append('id_statut', ticketData.id_statut);
            if (ticketData.startDate) {
                formData.append('date_debut', ticketData.startDate);
            }
            if (ticketData.endDate) {
                formData.append('date_fin_prevue', ticketData.endDate);
            }

            // Ajouter les pièces jointes
            console.log('Fichiers envoyés:', attachments);
            attachments.forEach((file, index) => {
                formData.append(`attachments[${index}]`, file);
            });

            const response = await createTicketFromChat(formData);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `Ticket créé avec succès ! Numéro du ticket : ${response.id}`
            }]);
            setTicketData(null);
            setAttachments([]);
        } catch (error) {
            const errorMessage = error.message || "Une erreur est survenue lors de la création du ticket.";
            setError(errorMessage);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: errorMessage
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Ajouter le gestionnaire de clic sur les messages
    const handleMessageClick = (message) => {
        if (message.role === 'assistant' && !isLoading) {
            setInput(message.content);
            handleSubmit(new Event('submit'));
        }
    };

    // Ajouter le gestionnaire de la touche Entrée
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    // Garder le focus sur l'input
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, [messages, isLoading]);

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
                <ToastContainer
                    position="top-right"
                    autoClose={5000}
                    hideProgressBar={false}
                    newestOnTop
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                    theme="light"
                />
                <h1 className="text-2xl font-bold mb-6">Création de ticket assistée par IA</h1>
                {error && (
                    <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Tableau de suivi des attributs */}
                <div className="mb-6 overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">Attribut</th>
                                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">Valeur</th>
                                <th className="px-4 py-2 text-center text-sm font-semibold text-gray-600">Statut</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            <tr>
                                <td className="px-4 py-2 text-sm text-gray-700">Titre</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{ticketData?.title || '-'}</td>
                                <td className="px-4 py-2 text-center">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ticketData?.title ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {ticketData?.title ? '✓' : '✗'}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td className="px-4 py-2 text-sm text-gray-700">Description</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{ticketData?.description || '-'}</td>
                                <td className="px-4 py-2 text-center">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ticketData?.description ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {ticketData?.description ? '✓' : '✗'}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td className="px-4 py-2 text-sm text-gray-700">Catégorie</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{ticketData?.category || '-'}</td>
                                <td className="px-4 py-2 text-center">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ticketData?.category ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {ticketData?.category ? '✓' : '✗'}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td className="px-4 py-2 text-sm text-gray-700">Emplacement</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{ticketData?.location || '-'}</td>
                                <td className="px-4 py-2 text-center">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ticketData?.location ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {ticketData?.location ? '✓' : '✗'}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td className="px-4 py-2 text-sm text-gray-700">Pièces jointes</td>
                                <td className="px-4 py-2 text-sm text-gray-600">
                                    {attachments.length > 0 ? attachments.map(f => f.name).join(', ') : '-'}
                                </td>
                                <td className="px-4 py-2 text-center">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${attachments.length > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {attachments.length > 0 ? '✓' : '-'}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col h-[600px] w-full max-w-2xl mx-auto bg-white rounded-lg shadow-lg">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    onClick={() => handleMessageClick(message)}
                                    className={`max-w-[80%] rounded-lg p-3 cursor-pointer transition-all duration-200 ${
                                        message.role === 'user'
                                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                    }`}
                                >
                                    {message.content}
                                    {message.component}
                                </div>
                            </div>
                        ))}
                        {renderCategories()}
                        {renderLocations()}
                        {renderAttachments()}
                        <div ref={messagesEndRef} />
                    </div>
                    <form onSubmit={handleSubmit} className="border-t p-4">
                        <div className="flex flex-col space-y-2">
                            <div className="flex space-x-2">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Tapez votre message..."
                                    className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isLoading}
                                />
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                >
                                    {isLoading ? 'Envoi...' : 'Envoyer'}
                                </button>
                            </div>
                            <div className="flex items-center space-x-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    onChange={handleFileChange}
                                    className="hidden"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-sm text-gray-600 hover:text-gray-800"
                                >
                                    Ajouter des pièces jointes
                                </button>
                                <span className="text-sm text-gray-500">
                                    Types acceptés : PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (max 10 Mo)
                                </span>
                            </div>
                        </div>
                    </form>
                    {ticketData && (
                        <div className="border-t p-4 bg-gray-50">
                            <button
                                onClick={handleCreateTicket}
                                disabled={
                                    isLoading ||
                                    !ticketData?.title ||
                                    !ticketData?.description ||
                                    !ticketData?.id_categorie ||
                                    !ticketData?.id_emplacement
                                }
                                className="w-full bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                            >
                                {isLoading ? 'Création en cours...' : 'Créer le ticket'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default ChatBot;