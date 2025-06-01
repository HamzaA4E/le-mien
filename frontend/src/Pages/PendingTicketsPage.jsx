import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import Layout from '../components/Layout';
import { FaSyncAlt, FaEye, FaTicketAlt, FaTimesCircle } from 'react-icons/fa';

// Fonction utilitaire pour formater les dates Laravel ou string
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
    return isNaN(date) ? '-' : date.toLocaleString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

const PendingTicketsPage = () => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [showRejected, setShowRejected] = useState(false);
    const [spin, setSpin] = useState(false);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [approveTicketId, setApproveTicketId] = useState(null);
    const [approveStartDate, setApproveStartDate] = useState('');
    const [approveEndDate, setApproveEndDate] = useState('');
    const [approveError, setApproveError] = useState('');
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    useEffect(() => {
        fetchTickets();
    }, [showRejected]);

    const fetchTickets = async () => {
        setSpin(true);
        try {
            const response = await axios.get('/api/tickets/pending', {
                params: { show_rejected: showRejected }
            });
            setTickets(response.data);
            setLoading(false);
        } catch (err) {
            setError('Erreur lors du chargement des tickets');
            setLoading(false);
        } finally {
            setTimeout(() => setSpin(false), 600);
        }
    };

    const openApproveModal = (id) => {
        setApproveTicketId(id);
        setApproveStartDate('');
        setApproveEndDate('');
        setApproveError('');
        setShowApproveModal(true);
    };

    const closeApproveModal = () => {
        setShowApproveModal(false);
        setApproveTicketId(null);
        setApproveStartDate('');
        setApproveEndDate('');
        setApproveError('');
    };

    const handleApproveWithDates = async () => {
        if (!approveStartDate || !approveEndDate) {
            setApproveError('Veuillez renseigner les deux dates.');
            return;
        }
        if (approveEndDate < approveStartDate) {
            setApproveError('La date de fin prévue doit être postérieure à la date de début.');
            return;
        }
        try {
            await axios.post(`/api/tickets/${approveTicketId}/approve`, {
                DateDebut: approveStartDate,
                DateFinPrevue: approveEndDate
            });
            setSuccessMessage('Le ticket a été approuvé avec succès.');
            setErrorMessage('');
            closeApproveModal();
            fetchTickets();
        } catch (err) {
            setApproveError("Une erreur est survenue lors de l'approbation du ticket.");
        }
    };

    const handleReject = async (id) => {
        try {
            await axios.post(`/api/tickets/${id}/reject`);
            setSuccessMessage('Le ticket a été refusé avec succès.');
            setErrorMessage('');
            fetchTickets();
        } catch (err) {
            setErrorMessage("Une erreur est survenue lors du refus du ticket.");
            setSuccessMessage('');
        }
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
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold text-gray-900">
                            {showRejected ? 'Tickets refusés' : 'Tickets en attente'}
                        </h1>
                    </div>
                    <div className="animate-pulse">
                        <div className="h-24 bg-gray-200 rounded mb-4"></div>
                        <div className="h-24 bg-gray-200 rounded mb-4"></div>
                        <div className="h-24 bg-gray-200 rounded mb-4"></div>
                    </div>
                </div>
            </Layout>
        );
    }
    if (error) {
        return (
            <Layout>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold text-gray-900">
                            {showRejected ? 'Tickets refusés' : 'Tickets en attente'}
                        </h1>
                    </div>
                    <div className="text-red-600">{error}</div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold">
                            {showRejected ? 'Tickets refusés' : 'Tickets en attente'}
                        </h1>
                        <button
                            onClick={fetchTickets}
                            className="p-2 rounded-full bg-gray-100 hover:bg-blue-100 text-blue-600 transition"
                            title="Rafraîchir"
                        >
                            <FaSyncAlt className={spin ? 'animate-spin-once' : ''} />
                        </button>
                    </div>
                    <button
                        onClick={() => setShowRejected(!showRejected)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            showRejected
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-red-600 text-white hover:bg-red-700'
                        }`}
                    >
                        {showRejected ? 'Voir les tickets en attente' : 'Voir les tickets refusés'}
                    </button>
                </div>
                {successMessage && (
                    <div className="mb-4 p-4 bg-green-100 text-green-800 rounded">{successMessage}</div>
                )}
                {errorMessage && (
                    <div className="mb-4 p-4 bg-red-100 text-red-800 rounded">{errorMessage}</div>
                )}
                {showApproveModal && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
                        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                            <h2 className="text-xl font-bold mb-4">Définir les dates du ticket</h2>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
                                <input
                                    type="date"
                                    className="w-full border rounded px-3 py-2"
                                    value={approveStartDate}
                                    onChange={e => setApproveStartDate(e.target.value)}
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin prévue</label>
                                <input
                                    type="date"
                                    className="w-full border rounded px-3 py-2"
                                    value={approveEndDate}
                                    onChange={e => setApproveEndDate(e.target.value)}
                                    min={approveStartDate}
                                />
                            </div>
                            {approveError && <div className="mb-2 text-red-600 text-sm">{approveError}</div>}
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={closeApproveModal}
                                    className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                                >Annuler</button>
                                <button
                                    onClick={handleApproveWithDates}
                                    className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
                                >Valider</button>
                            </div>
                        </div>
                    </div>
                )}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titre</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Demandeur</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date de création</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priorité</th>
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
                                            <div className="text-sm text-gray-900">{ticket.demandeur?.designation}</div>
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
                                            <div className="text-sm text-gray-900">{ticket.priorite?.designation}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button
                                                onClick={() => openDetailModal(ticket.id)}
                                                className="text-blue-600 hover:text-blue-900 mr-2"
                                                title="Voir le détail"
                                            >
                                                <FaEye />
                                            </button>
                                            {!showRejected && (
                                                <>
                                                    <button
                                                        onClick={() => openApproveModal(ticket.id)}
                                                        className="text-green-600 hover:text-green-900 mr-4"
                                                    >
                                                        Approuver
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(ticket.id)}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        Refuser
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                {showDetailModal && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
                        <div className="relative bg-white p-8 rounded-xl shadow-xl w-full max-w-2xl">
                            <button
                                onClick={closeDetailModal}
                                className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-2xl transition"
                                title="Fermer"
                            >
                                ×
                            </button>
                            <h2 className="text-xl font-bold text-blue-700 mb-6">Résumé du ticket</h2>
                            {loadingDetail ? (
                                <div className="text-center text-blue-600 font-semibold">Chargement...</div>
                            ) : selectedTicket ? (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 mb-6">
                                        <div>
                                            <div className="mb-2">
                                                <span className="font-semibold text-gray-600">Titre :</span>
                                                <span className="ml-2 text-gray-900">{selectedTicket.Titre}</span>
                                            </div>
                                            <div className="mb-2">
                                                <span className="font-semibold text-gray-600">Description :</span>
                                                <span className="ml-2 text-gray-900">{selectedTicket.Description}</span>
                                            </div>
                                            <div className="mb-2">
                                                <span className="font-semibold text-gray-600">Catégorie :</span>
                                                <span className="ml-2 text-gray-900">{selectedTicket.categorie?.designation}</span>
                                            </div>
                                            <div className="mb-2">
                                                <span className="font-semibold text-gray-600">Emplacement :</span>
                                                <span className="ml-2 text-gray-900">{selectedTicket.emplacement?.designation}</span>
                                            </div>
                                            <div className="mb-2">
                                                <span className="font-semibold text-gray-600">Service :</span>
                                                <span className="ml-2 text-gray-900">{selectedTicket.demandeur?.service?.designation}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="mb-2">
                                                <span className="font-semibold text-gray-600">Date de début :</span>
                                                <span className="ml-2 text-gray-900">{formatDate(selectedTicket.DateDebut)}</span>
                                            </div>
                                            <div className="mb-2">
                                                <span className="font-semibold text-gray-600">Date de fin :</span>
                                                <span className="ml-2 text-gray-900">{formatDate(selectedTicket.DateFinPrevue)}</span>
                                            </div>
                                            <div className="mb-2">
                                                <span className="font-semibold text-gray-600">Priorité :</span>
                                                <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${
                                                    selectedTicket.priorite?.designation === 'Urgent'
                                                        ? 'bg-red-50 text-red-600 border border-red-200'
                                                        : 'bg-green-50 text-green-700 border border-green-200'
                                                }`}>
                                                    {selectedTicket.priorite?.designation}
                                                </span>
                                            </div>
                                            <div className="mb-2">
                                                <span className="font-semibold text-gray-600">Statut :</span>
                                                <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${
                                                    selectedTicket.statut?.designation === 'Nouveau'
                                                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                        : selectedTicket.statut?.designation === 'Refusé'
                                                        ? 'bg-red-50 text-red-700 border border-red-200'
                                                        : 'bg-gray-50 text-gray-700 border border-gray-200'
                                                }`}>
                                                    {selectedTicket.statut?.designation}
                                                </span>
                                            </div>
                                            <div className="mb-2">
                                                <span className="font-semibold text-gray-600">Demandeur :</span>
                                                <span className="ml-2 text-gray-900">{selectedTicket.demandeur?.designation}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 mt-2">
                                        <button
                                            onClick={() => { closeDetailModal(); openApproveModal(selectedTicket.id); }}
                                            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 font-semibold shadow-sm transition"
                                        >
                                            Approuver
                                        </button>
                                        <button
                                            onClick={() => { closeDetailModal(); handleReject(selectedTicket.id); }}
                                            className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 font-semibold shadow-sm transition"
                                        >
                                            Refuser
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center text-red-600">Erreur lors du chargement du ticket.</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default PendingTicketsPage; 