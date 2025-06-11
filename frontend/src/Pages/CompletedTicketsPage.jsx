import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import Layout from '../components/Layout';
import { Link } from 'react-router-dom';
import { FaSyncAlt } from 'react-icons/fa';

// Composant Modal de refus
const RejectModal = ({ isOpen, onClose, onReject, ticketId }) => {
    const [rejectionReason, setRejectionReason] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (!rejectionReason.trim()) {
            setError('Veuillez indiquer la raison du refus.');
            return;
        }
        onReject(ticketId, rejectionReason);
        setRejectionReason('');
        setError('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">Raison du refus</h2>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Motif du refus</label>
                    <textarea
                        className="w-full border rounded px-3 py-2"
                        value={rejectionReason}
                        onChange={e => setRejectionReason(e.target.value)}
                        rows="4"
                        placeholder="Veuillez indiquer la raison du refus..."
                    />
                </div>
                {error && <div className="mb-2 text-red-600 text-sm">{error}</div>}
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                    >Annuler</button>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                    >Confirmer le refus</button>
                </div>
            </div>
        </div>
    );
};

// Composant Modal de détails
const DetailModal = ({ isOpen, onClose, ticket, loading }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
            <div className="relative bg-white p-8 rounded-xl shadow-xl w-full max-w-2xl">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-2xl transition"
                    title="Fermer"
                >
                    ×
                </button>
                <h2 className="text-xl font-bold text-blue-700 mb-6">Résumé du ticket</h2>
                {loading ? (
                    <div className="text-center text-blue-600 font-semibold">Chargement...</div>
                ) : ticket ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 mb-6">
                            <div>
                                <div className="mb-2">
                                    <span className="font-semibold text-gray-800">Titre :</span>
                                    <span className="ml-2 text-gray-900">{ticket.Titre}</span>
                                </div>
                                <div className="mb-2">
                                    <span className="font-semibold text-gray-800">Description :</span>
                                    <span className="ml-2 text-gray-900">{ticket.Description}</span>
                                </div>
                                <div className="mb-2">
                                    <span className="font-semibold text-gray-800">Catégorie :</span>
                                    <span className="ml-2 text-gray-900">{ticket.categorie?.designation}</span>
                                </div>
                                <div className="mb-2">
                                    <span className="font-semibold text-gray-800">Service :</span>
                                    <span className="ml-2 text-gray-900">{ticket.demandeur?.service?.designation}</span>
                                </div>
                            </div>
                            <div>
                                <div className="mb-2">
                                    <span className="font-semibold text-gray-800">Date de création :</span>
                                    <span className="ml-2 text-gray-900">{formatDate(ticket.DateCreation)}</span>
                                </div>
                                <div className="mb-2">
                                    <span className="font-semibold text-gray-800">Date de fin :</span>
                                    <span className="ml-2 text-gray-900">{formatDate(ticket.DateFinReelle)}</span>
                                </div>
                                <div className="mb-2">
                                    <span className="font-semibold text-gray-800">Statut :</span>
                                    <span className="ml-2 text-gray-900">{ticket.statut?.designation}</span>
                                </div>
                                <div className="mb-2">
                                    <span className="font-semibold text-gray-800">Demandeur :</span>
                                    <span className="ml-2 text-gray-900">{ticket.demandeur?.designation}</span>
                                </div>
                                {ticket.executant && (
                                    <div className="mb-2">
                                        <span className="font-semibold text-gray-800">Exécutant :</span>
                                        <span className="ml-2 text-gray-900">{ticket.executant.designation}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="text-center text-red-600">Erreur lors du chargement du ticket.</div>
                )}
            </div>
        </div>
    );
};

function formatDate(dateValue) {
    if (!dateValue) return '-';
    let dateString = dateValue;
    if (typeof dateValue === 'object' && dateValue.date) {
        dateString = dateValue.date;
    }
    if (typeof dateString === 'string' && dateString.includes('.')) {
        dateString = dateString.split('.')[0];
    }
    const isoString = dateString.replace(' ', 'T');
    const date = new Date(isoString);
    return isNaN(date) ? '-' : date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

const CompletedTicketsPage = () => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [spin, setSpin] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedTicketId, setSelectedTicketId] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        setSpin(true);
        try {
            const response = await axios.get('/api/tickets/completed');
            setTickets(response.data);
            setLoading(false);
        } catch (err) {
            setError('Erreur lors du chargement des tickets');
            setLoading(false);
        } finally {
            setTimeout(() => setSpin(false), 600);
        }
    };

    const handleApprove = async (ticketId) => {
        try {
            await axios.post(`/api/tickets/${ticketId}/demandeur-approve`);
            setSuccessMessage('Ticket approuvé avec succès');
            fetchTickets(); // Rafraîchir la liste
        } catch (err) {
            setError('Erreur lors de l\'approbation du ticket');
        }
    };

    const handleReject = async (ticketId, reason) => {
        try {
            await axios.post(`/api/tickets/${ticketId}/demandeur-reject`, { raison: reason });
            setSuccessMessage('Ticket refusé et remis en cours');
            setShowRejectModal(false);
            fetchTickets(); // Rafraîchir la liste
        } catch (err) {
            setError('Erreur lors du refus du ticket');
        }
    };

    const openRejectModal = (ticketId) => {
        setSelectedTicketId(ticketId);
        setShowRejectModal(true);
    };

    const openDetailModal = async (ticketId) => {
        setLoadingDetail(true);
        setShowDetailModal(true);
        try {
            const res = await axios.get(`/api/tickets/${ticketId}`);
            setSelectedTicket(res.data);
        } catch (e) {
            setSelectedTicket(null);
        }
        setLoadingDetail(false);
    };

    const closeDetailModal = () => {
        setShowDetailModal(false);
        setSelectedTicket(null);
    };

    if (loading) {
        return (
            <Layout>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="overflow-x-auto w-full">
                            <table className="w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3"></th>
                                        <th className="px-6 py-3"></th>
                                        <th className="px-6 py-3"></th>
                                        <th className="px-6 py-3"></th>
                                        <th className="px-6 py-3"></th>
                                        <th className="px-6 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...Array(3)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            {[...Array(6)].map((_, j) => (
                                                <td key={j} className="px-6 py-4">
                                                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }
    if (error) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-96">
                    <span className="text-lg text-red-600">{error}</span>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold">Tickets terminés</h1>
                        <button
                            onClick={fetchTickets}
                            className="p-2 rounded-full bg-gray-100 hover:bg-blue-100 text-blue-600 transition"
                            title="Rafraîchir"
                        >
                            <FaSyncAlt className={spin ? 'animate-spin-once' : ''} />
                        </button>
                    </div>
                </div>
                {successMessage && (
                    <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg">
                        {successMessage}
                    </div>
                )}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto w-full">
                        <table className="w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titre</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date de création</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date de fin</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {tickets.map((ticket) => (
                                    <tr key={ticket.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{ticket.Titre}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                ticket.statut?.designation === 'Terminé' 
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : 'bg-green-100 text-green-800'
                                            }`}>
                                                {ticket.statut?.designation}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {ticket.DateCreation && ticket.DateCreation.date
                                                    ? new Date(ticket.DateCreation.date.replace(' ', 'T')).toLocaleDateString('fr-FR', {
                                                        year: 'numeric',
                                                        month: '2-digit',
                                                        day: '2-digit'
                                                    })
                                                    : 'Date non disponible'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {ticket.DateFinReelle
                                                    ? new Date(ticket.DateFinReelle).toLocaleDateString('fr-FR', {
                                                        year: 'numeric',
                                                        month: '2-digit',
                                                        day: '2-digit'
                                                    })
                                                    : 'Date non disponible'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => openDetailModal(ticket.id)}
                                                    className="text-indigo-600 hover:text-indigo-900 cursor-pointer bg-transparent border-none p-0"
                                                    style={{ background: 'none' }}
                                                >
                                                    Voir les détails
                                                </button>
                                                {ticket.statut?.designation === 'Terminé' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleApprove(ticket.id)}
                                                            className="text-green-600 hover:text-green-900"
                                                        >
                                                            Approuver
                                                        </button>
                                                        <button
                                                            onClick={() => openRejectModal(ticket.id)}
                                                            className="text-red-600 hover:text-red-900"
                                                        >
                                                            Refuser
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <RejectModal
                isOpen={showRejectModal}
                onClose={() => setShowRejectModal(false)}
                onReject={handleReject}
                ticketId={selectedTicketId}
            />
            <DetailModal
                isOpen={showDetailModal}
                onClose={closeDetailModal}
                ticket={selectedTicket}
                loading={loadingDetail}
            />
        </Layout>
    );
};

export default CompletedTicketsPage; 