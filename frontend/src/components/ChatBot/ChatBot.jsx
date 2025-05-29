import React, { useState, useRef, useEffect } from 'react';
import { chatWithGemini, createTicketFromChat, extractTicketInfo } from '../../utils/chatbotService';
import Layout from '../Layout';
import axios from '../../utils/axios';

const ChatBot = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [ticketData, setTicketData] = useState(null);
    const [ticketOptions, setTicketOptions] = useState(null);
    const [error, setError] = useState(null);
    const [userInfo, setUserInfo] = useState(null);
    const messagesEndRef = useRef(null);

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
                const requiredOptions = ['categories', 'types', 'emplacements', 'priorites'];
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || !userInfo || !ticketOptions) {
            setError('Veuillez attendre le chargement des données avant de continuer.');
            return;
        }

        // Vérifier que toutes les options requises sont présentes
        const requiredOptions = ['categories', 'types', 'emplacements', 'priorites'];
        const missingOptions = requiredOptions.filter(option => !ticketOptions[option]?.length);
        
        if (missingOptions.length > 0) {
            setError(`Les options suivantes ne sont pas disponibles : ${missingOptions.join(', ')}. Veuillez rafraîchir la page.`);
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
                    types: ticketOptions.types || [],
                    emplacements: ticketOptions.emplacements || [],
                    priorites: ticketOptions.priorites || []
                }
            };

            console.log('Options envoyées au chat:', contextWithOptions.ticketOptions);

            const response = await chatWithGemini(userMessage, messages, contextWithOptions);
            
            // Vérifier si la réponse contient plusieurs questions
            const questions = response.split('?').filter(q => q.trim().length > 0);
            
            if (questions.length > 1) {
                // Si plusieurs questions, ne garder que la première
                const firstQuestion = questions[0] + '?';
                setMessages(prev => [...prev, { role: 'assistant', content: firstQuestion }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: response }]);
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
            const response = await createTicketFromChat(ticketData);
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

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
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
                                <td className="px-4 py-2 text-sm text-gray-700">Type</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{ticketData?.type || '-'}</td>
                                <td className="px-4 py-2 text-center">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ticketData?.type ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {ticketData?.type ? '✓' : '✗'}
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
                                    className={`max-w-[80%] rounded-lg p-3 ${
                                        message.role === 'user'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-100 text-gray-800'
                                    }`}
                                >
                                    {message.content}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                    <form onSubmit={handleSubmit} className="border-t p-4">
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
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