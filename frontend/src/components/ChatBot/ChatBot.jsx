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
    const [showPriorities, setShowPriorities] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dateType, setDateType] = useState(null); // 'start' ou 'end'
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
                const requiredOptions = ['categories', 'emplacements', 'priorites'];
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
            case 'priority':
                setShowPriorities(false);
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
                emplacements: ticketOptions.emplacements || [],
                priorites: ticketOptions.priorites || []
            }
        };

        // Déterminer le service en fonction du niveau d'utilisateur
        let service = 'Support';
        if (userInfo.niveau === 1) {
            service = 'Administration';
        } else if (userInfo.niveau === 2) {
            service = 'Demandeur';
        }

        contextWithOptions.service = service;

        // Envoyer le message directement
        chatWithGemini(userMessage, messages, contextWithOptions)
            .then(response => {
                // Vérifier le type de demande dans la réponse
                const lowerResponse = response.toLowerCase();
                setShowCategories(lowerResponse.includes('catégorie'));
                setShowLocations(lowerResponse.includes('emplacement'));
                setShowPriorities(lowerResponse.includes('priorité'));
                
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
                    setShowPriorities(false);
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
                case 'priority':
                    return 'bg-purple-50 hover:bg-purple-100 text-purple-800';
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

    const renderPriorities = () => {
        if (!showPriorities || !ticketOptions?.priorites) return null;
        return renderOptionTable(ticketOptions.priorites, 'priority', 'Sélectionnez une priorité :');
    };

    const renderTicketSummary = (ticketData) => {
        if (!ticketData) return null;

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
                                <td className="px-4 py-2 text-sm font-medium text-gray-600">Priorité</td>
                                <td className="px-4 py-2 text-sm text-gray-800">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                        ${ticketData.priority === 'Urgent' ? 'bg-red-100 text-red-800' :
                                        ticketData.priority === 'Moyenne' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-green-100 text-green-800'}`}>
                                        {ticketData.priority || '-'}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td className="px-4 py-2 text-sm font-medium text-gray-600">Emplacement</td>
                                <td className="px-4 py-2 text-sm text-gray-800">{ticketData.location || '-'}</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-2 text-sm font-medium text-gray-600">Date de début</td>
                                <td className="px-4 py-2 text-sm text-gray-800">
                                    {ticketData.startDate ? new Date(ticketData.startDate).toLocaleDateString('fr-FR') : '-'}
                                </td>
                            </tr>
                            <tr>
                                <td className="px-4 py-2 text-sm font-medium text-gray-600">Date de fin</td>
                                <td className="px-4 py-2 text-sm text-gray-800">
                                    {ticketData.endDate ? new Date(ticketData.endDate).toLocaleDateString('fr-FR') : '-'}
                                </td>
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
                        </tbody>
                    </table>
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
        const requiredOptions = ['categories', 'emplacements', 'priorites'];
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
                    emplacements: ticketOptions.emplacements || [],
                    priorites: ticketOptions.priorites || []
                }
            };

            // Déterminer le service en fonction du niveau d'utilisateur
            let service = 'Support';
            if (userInfo.niveau === 1) {
                service = 'Administration';
            } else if (userInfo.niveau === 2) {
                service = 'Demandeur';
            }

            contextWithOptions.service = service;

            console.log('Options envoyées au chat:', contextWithOptions.ticketOptions);

            const response = await chatWithGemini(userMessage, messages, contextWithOptions);
            
            // Vérifier le type de demande dans la réponse
            const lowerResponse = response.toLowerCase();
            setShowCategories(lowerResponse.includes('catégorie'));
            setShowLocations(lowerResponse.includes('emplacement'));
            setShowPriorities(lowerResponse.includes('priorité'));
            
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

        try {
            setIsLoading(true);
            setError(null);

            // Formater les dates avant l'envoi
            const formattedTicketData = {
                ...ticketData,
                startDate: ticketData.startDate ? new Date(ticketData.startDate).toISOString().split('T')[0] : null,
                endDate: ticketData.endDate ? new Date(ticketData.endDate).toISOString().split('T')[0] : null
            };

            const response = await createTicketFromChat(formattedTicketData);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `Ticket créé avec succès ! Numéro du ticket : ${response.id}`
            }]);
            setTicketData(null);
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
                                <td className="px-4 py-2 text-sm text-gray-700">Priorité</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{ticketData?.priority || '-'}</td>
                                <td className="px-4 py-2 text-center">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ticketData?.priority ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {ticketData?.priority ? '✓' : '✗'}
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
                                <td className="px-4 py-2 text-sm text-gray-700">Date de début</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{ticketData?.startDate || '-'}</td>
                                <td className="px-4 py-2 text-center">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ticketData?.startDate ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {ticketData?.startDate ? '✓' : '✗'}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td className="px-4 py-2 text-sm text-gray-700">Date de fin</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{ticketData?.endDate || '-'}</td>
                                <td className="px-4 py-2 text-center">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ticketData?.endDate ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {ticketData?.endDate ? '✓' : '✗'}
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
                        {renderPriorities()}
                        <div ref={messagesEndRef} />
                    </div>
                    <form onSubmit={handleSubmit} className="border-t p-4">
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
                    </form>
                    {ticketData && (
                        <div className="border-t p-4 bg-gray-50">
                            <button
                                onClick={handleCreateTicket}
                                disabled={isLoading}
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