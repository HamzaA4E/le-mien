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

    console.warn('=== CHATBOT DEBUG ===');
    console.warn('ChatBot component rendered');

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        console.warn('=== CHATBOT DEBUG ===');
        console.warn('Fetching user info and ticket options...');
        const fetchData = async () => {
            try {
                // Récupérer les informations de l'utilisateur
                const userResponse = await axios.get('/api/user');
                console.warn('User info received:', userResponse.data);
                setUserInfo(userResponse.data);

                // Récupérer les options de ticket
                const optionsResponse = await axios.get('/api/tickets/options');
                console.warn('Ticket options received:', optionsResponse.data);
                setTicketOptions(optionsResponse.data.options);
            } catch (error) {
                console.error('Error fetching data:', error);
                setError('Erreur lors du chargement des données. Veuillez rafraîchir la page.');
            }
        };
        fetchData();
    }, []);

    const initializeChat = () => {
        console.warn('=== CHATBOT DEBUG ===');
        console.warn('Initializing chat...');
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
        if (!input.trim() || !userInfo) return;

        console.warn('=== CHATBOT DEBUG ===');
        console.warn('Handling submit with input:', input);
        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);
        setError(null);

        try {
            console.warn('Calling chatWithGemini...');
            const response = await chatWithGemini(userMessage, messages, userInfo);
            console.warn('Response from chatWithGemini:', response);
            
            setMessages(prev => [...prev, { role: 'assistant', content: response }]);

            // Vérifier si nous avons toutes les informations nécessaires pour créer un ticket
            console.warn('Extracting ticket info...');
            const extractedInfo = extractTicketInfo([...messages, { role: 'user', content: userMessage }, { role: 'assistant', content: response }], ticketOptions, userInfo);
            console.warn('Extracted ticket info:', extractedInfo);
            
            if (extractedInfo.title && extractedInfo.description) {
                console.warn('Setting ticket data...');
                setTicketData(extractedInfo);
                // Proposer de créer le ticket
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: "J'ai toutes les informations nécessaires. Voulez-vous que je crée le ticket maintenant ? (Répondez par 'oui' ou 'non')"
                }]);
            }
        } catch (error) {
            console.error('=== CHATBOT ERROR ===');
            console.error('Error in handleSubmit:', error);
            const errorMessage = error.message || "Une erreur est survenue. Veuillez réessayer.";
            console.error('Setting error message:', errorMessage);
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

        console.warn('=== CHATBOT DEBUG ===');
        console.warn('Creating ticket with data:', ticketData);
        try {
            setIsLoading(true);
            setError(null);
            const response = await createTicketFromChat(ticketData);
            console.warn('Ticket created successfully:', response);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `Ticket créé avec succès ! Numéro du ticket : ${response.id}`
            }]);
            setTicketData(null);
        } catch (error) {
            console.error('=== CHATBOT ERROR ===');
            console.error('Error creating ticket:', error);
            const errorMessage = error.message || "Une erreur est survenue lors de la création du ticket.";
            console.error('Setting error message:', errorMessage);
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
                            <h3 className="text-lg font-semibold mb-2">Résumé du ticket</h3>
                            <div className="space-y-2">
                                <p><strong>Titre:</strong> {ticketData.title}</p>
                                <p><strong>Description:</strong> {ticketData.description}</p>
                                <p><strong>Catégorie:</strong> {ticketData.category}</p>
                                <p><strong>Priorité:</strong> {ticketData.priority}</p>
                                <p><strong>Service:</strong> {ticketData.service}</p>
                                <p><strong>Emplacement:</strong> {ticketData.location}</p>
                                <p><strong>Société:</strong> {ticketData.company}</p>
                                <p><strong>Demandeur:</strong> {ticketData.requester}</p>
                                <button
                                    onClick={handleCreateTicket}
                                    disabled={isLoading}
                                    className="w-full bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                                >
                                    Créer le ticket
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default ChatBot; 