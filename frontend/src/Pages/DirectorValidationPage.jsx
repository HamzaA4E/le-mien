import React, { useState, useEffect, useCallback } from 'react';
import axios from '../utils/axios';
import Layout from '../components/Layout';
import { FaSyncAlt, FaEye, FaCheck, FaTimes, FaTicketAlt } from 'react-icons/fa';

// Composant Modal de validation
const ValidationModal = ({ isOpen, onClose, onValidate, ticket, loading }) => {
    const [error, setError] = useState('');

    const handleValidate = useCallback(() => {
        onValidate(ticket.id);
    }, [onValidate, ticket]);

    if (!isOpen || !ticket) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
            <div className="relative p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="mt-3 text-center">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Valider le projet</h3>
                    <div className="mt-2 px-7 py-3">
                        <p className="text-sm text-gray-500 mb-4">
                            Êtes-vous sûr de vouloir valider ce projet ?
                        </p>
                        <div className="bg-gray-50 p-3 rounded-md mb-4">
                            <p className="text-sm font-medium text-gray-700">Titre: {ticket.Titre}</p>
                            <p className="text-sm text-gray-600">Demandeur: {ticket.demandeur?.designation}</p>
                            <p className="text-sm text-gray-600">Service: {ticket.demandeur?.service?.designation}</p>
                        </div>
                        {error && (
                            <div className="mb-4 text-sm text-red-600">
                                {error}
                            </div>
                        )}
                    </div>
                    <div className="flex justify-center space-x-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                            disabled={loading}
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleValidate}
                            disabled={loading}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Validation...' : 'Valider'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Composant Modal de refus
const RejectModal = ({ isOpen, onClose, onReject, ticketId }) => {
    const [raison, setRaison] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!raison.trim()) {
            setError('Veuillez saisir une raison de refus.');
            return;
        }

        setLoading(true);
        try {
            await onReject(ticketId, raison);
            setRaison('');
            setError('');
            onClose();
        } catch (error) {
            setError('Erreur lors du refus du projet.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
            <div className="relative p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="mt-3">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Refuser le projet</h3>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Raison du refus
                        </label>
                        <textarea
                            value={raison}
                            onChange={(e) => setRaison(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                            rows="4"
                            placeholder="Saisissez la raison du refus..."
                        />
                    </div>
                    {error && (
                        <div className="mb-4 text-sm text-red-600">
                            {error}
                        </div>
                    )}
                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                            disabled={loading}
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Refus...' : 'Refuser'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Composant Modal de détails
const DetailModal = ({ isOpen, onClose, ticket, onValidate, onReject, loading }) => {
    if (!isOpen || !ticket) return null;

    return (
        <div className="fixed left-0 top-0 w-screen h-screen bg-gray-900 bg-opacity-60 flex items-center justify-center z-50">
            <div className="relative p-6 border w-full max-w-lg shadow-2xl rounded-xl bg-white">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Détails du projet
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <FaTimes size={20} />
                    </button>
                </div>
                <div className="space-y-3">
                    {ticket.Titre && (
                        <div>
                            <span className="font-semibold text-gray-600">Titre :</span>
                            <span className="ml-2 text-gray-900">{ticket.Titre}</span>
                        </div>
                    )}
                    {ticket.Description && (
                        <div>
                            <span className="font-semibold text-gray-600">Description :</span>
                            <span className="ml-2 text-gray-900 whitespace-pre-wrap">{ticket.Description}</span>
                        </div>
                    )}
                    {ticket.DateCreation && (
                        <div>
                            <span className="font-semibold text-gray-600">Date de création :</span>
                            <span className="ml-2 text-gray-900">
                                {new Date(ticket.DateCreation).toLocaleDateString('fr-FR')}
                            </span>
                        </div>
                    )}
                    {ticket.demandeur?.designation && (
                        <div>
                            <span className="font-semibold text-gray-600">Demandeur :</span>
                            <span className="ml-2 text-gray-900">{ticket.demandeur.designation}</span>
                        </div>
                    )}
                    {ticket.demandeur?.service?.designation && (
                        <div>
                            <span className="font-semibold text-gray-600">Service :</span>
                            <span className="ml-2 text-gray-900">{ticket.demandeur.service.designation}</span>
                        </div>
                    )}
                    {ticket.typeDemande?.designation && (
                        <div>
                            <span className="font-semibold text-gray-600">Type de demande :</span>
                            <span className="ml-2 text-gray-900">{ticket.typeDemande.designation}</span>
                        </div>
                    )}
                    {ticket.categorie?.designation && (
                        <div>
                            <span className="font-semibold text-gray-600">Catégorie :</span>
                            <span className="ml-2 text-gray-900">{ticket.categorie.designation}</span>
                        </div>
                    )}
                    {ticket.emplacement?.designation && (
                        <div>
                            <span className="font-semibold text-gray-600">Emplacement :</span>
                            <span className="ml-2 text-gray-900">{ticket.emplacement.designation}</span>
                        </div>
                    )}
                    {ticket.priorite?.designation && (
                        <div>
                            <span className="font-semibold text-gray-600">Priorité :</span>
                            <span className="ml-2 text-gray-900">{ticket.priorite.designation}</span>
                        </div>
                    )}
                    {ticket.DateDebut && (
                        <div>
                            <span className="font-semibold text-gray-600">Date de début :</span>
                            <span className="ml-2 text-gray-900">
                                {new Date(ticket.DateDebut).toLocaleDateString('fr-FR')}
                            </span>
                        </div>
                    )}
                    {ticket.DateFinPrevue && (
                        <div>
                            <span className="font-semibold text-gray-600">Date de fin prévue :</span>
                            <span className="ml-2 text-gray-900">
                                {new Date(ticket.DateFinPrevue).toLocaleDateString('fr-FR')}
                            </span>
                        </div>
                    )}
                    {ticket.executant?.designation && (
                        <div>
                            <span className="font-semibold text-gray-600">Exécutant :</span>
                            <span className="ml-2 text-gray-900">{ticket.executant.designation}</span>
                        </div>
                    )}
                    {ticket.Commentaire && (
                        <div>
                            <span className="font-semibold text-gray-600">Commentaire :</span>
                            <span className="ml-2 text-gray-900">{ticket.Commentaire}</span>
                        </div>
                    )}
                </div>
                {ticket.attachment_path && (
                    <div className="mt-6">
                        <h4 className="font-medium text-gray-900 mb-3">Pièce jointe</h4>
                        <a
                            href={`/storage/${ticket.attachment_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                        >
                            Voir la pièce jointe
                        </a>
                    </div>
                )}
                <div className="mt-6 flex justify-end space-x-3">
                    <button
                        onClick={() => onReject(ticket.id)}
                        disabled={loading}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                    >
                        <FaTimes size={14} />
                        <span>Refuser</span>
                    </button>
                    <button
                        onClick={() => onValidate(ticket.id)}
                        disabled={loading}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                    >
                        <FaCheck size={14} />
                        <span>Valider</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

const DirectorValidationPage = () => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [showValidationModal, setShowValidationModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [error, setError] = useState('');

    const fetchTickets = useCallback(async () => {
        try {
            setError('');
            const response = await axios.get('/api/tickets', {
                params: {
                    statut: 'En attente de validation',
                    type_demande: 'Projet'
                }
            });
            console.log('Réponse API tickets:', response.data);
            // L'API retourne un objet de pagination, on extrait les données
            const ticketsData = response.data.data || response.data;
            console.log('Tickets data:', ticketsData);
            setTickets(ticketsData);
        } catch (error) {
            console.error('Erreur lors du chargement des tickets:', error);
            setError('Erreur lors du chargement des tickets');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchTickets();
    };

    const handleValidate = async (ticketId) => {
        try {
            setLoading(true);
            await axios.post(`/api/tickets/${ticketId}/validate-by-director`);
            await fetchTickets();
            setShowValidationModal(false);
            setShowDetailModal(false);
        } catch (error) {
            console.error('Erreur lors de la validation:', error);
            setError('Erreur lors de la validation du projet');
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async (ticketId, raison) => {
        try {
            setLoading(true);
            await axios.post(`/api/tickets/${ticketId}/reject`, { raison });
            await fetchTickets();
            setShowRejectModal(false);
            setShowDetailModal(false);
        } catch (error) {
            console.error('Erreur lors du refus:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const openValidationModal = (ticket) => {
        setSelectedTicket(ticket);
        setShowValidationModal(true);
    };

    const openRejectModal = (ticketId) => {
        setSelectedTicket({ id: ticketId });
        setShowRejectModal(true);
    };

    const openDetailModal = (ticket) => {
        setSelectedTicket(ticket);
        setShowDetailModal(true);
    };

    const formatDate = (dateValue) => {
        if (!dateValue) return 'Non définie';
        return new Date(dateValue).toLocaleDateString('fr-FR');
    };

    if (loading && !refreshing) {
        return (
            <Layout>
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">
                        Validation des projets
                    </h1>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        <FaSyncAlt className={refreshing ? 'animate-spin' : ''} />
                        <span>Actualiser</span>
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                        {error}
                    </div>
                )}

                {(!tickets || tickets.length === 0) ? (
                    <div className="text-center py-12">
                        <FaTicketAlt className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Aucun projet en attente de validation
                        </h3>
                        <p className="text-gray-500">
                            Tous les projets de votre service ont été traités.
                        </p>
                    </div>
                ) : (
                    <div className="bg-white shadow overflow-hidden sm:rounded-md">
                        <ul className="divide-y divide-gray-200">
                            {Array.isArray(tickets) && tickets.map((ticket) => (
                                <li key={ticket.id} className="px-6 py-4 hover:bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center space-x-3">
                                                <div className="flex-shrink-0">
                                                    <FaTicketAlt className="h-5 w-5 text-blue-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        {ticket.Titre}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        Demandeur: {ticket.demandeur?.designation} | 
                                                        Service: {ticket.demandeur?.service?.designation} | 
                                                        Créé le: {formatDate(ticket.DateCreation)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => openDetailModal(ticket)}
                                                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                                title="Voir les détails"
                                            >
                                                <FaEye size={16} />
                                            </button>
                                            <button
                                                onClick={() => openValidationModal(ticket)}
                                                disabled={loading}
                                                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-1"
                                            >
                                                <FaCheck size={12} />
                                                <span>Valider</span>
                                            </button>
                                            <button
                                                onClick={() => openRejectModal(ticket.id)}
                                                disabled={loading}
                                                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center space-x-1"
                                            >
                                                <FaTimes size={12} />
                                                <span>Refuser</span>
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Modals */}
            <ValidationModal
                isOpen={showValidationModal}
                onClose={() => setShowValidationModal(false)}
                onValidate={handleValidate}
                ticket={selectedTicket}
                loading={loading}
            />

            <RejectModal
                isOpen={showRejectModal}
                onClose={() => setShowRejectModal(false)}
                onReject={handleReject}
                ticketId={selectedTicket?.id}
            />

            <DetailModal
                isOpen={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                ticket={selectedTicket}
                onValidate={handleValidate}
                onReject={openRejectModal}
                loading={loading}
            />
        </Layout>
    );
};

export default DirectorValidationPage; 