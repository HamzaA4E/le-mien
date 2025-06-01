import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import Layout from '../components/Layout';
import { FaSyncAlt, FaEye } from 'react-icons/fa';

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

    if (loading) return <div>Chargement...</div>;
    if (error) return <div>{error}</div>;

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
                                                onClick={() => window.location.href = `/tickets/${ticket.id}`}
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
            </div>
        </Layout>
    );
};

export default PendingTicketsPage; 