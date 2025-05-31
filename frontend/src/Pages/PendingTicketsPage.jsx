import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import Layout from '../components/Layout';
import { FaSyncAlt } from 'react-icons/fa';

const PendingTicketsPage = () => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [showRejected, setShowRejected] = useState(false);
    const [spin, setSpin] = useState(false);

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

    const handleApprove = async (id) => {
        try {
            await axios.post(`/api/tickets/${id}/approve`);
            setSuccessMessage('Le ticket a été approuvé avec succès.');
            setErrorMessage('');
            fetchTickets(); // Rafraîchir la liste
        } catch (err) {
            setErrorMessage("Une erreur est survenue lors de l'approbation du ticket.");
            setSuccessMessage('');
        }
    };

    const handleReject = async (id) => {
        try {
            await axios.post(`/api/tickets/${id}/reject`);
            setSuccessMessage('Le ticket a été refusé avec succès.');
            setErrorMessage('');
            fetchTickets(); // Rafraîchir la liste
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
                                            {!showRejected && (
                                                <>
                                                    <button
                                                        onClick={() => handleApprove(ticket.id)}
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