import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import Layout from '../components/Layout';
import { Link } from 'react-router-dom';

const CompletedTicketsPage = () => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        try {
            const response = await axios.get('/api/tickets/completed');
            setTickets(response.data);
            setLoading(false);
        } catch (err) {
            setError('Erreur lors du chargement des tickets');
            setLoading(false);
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

    const handleReject = async (ticketId) => {
        try {
            await axios.post(`/api/tickets/${ticketId}/demandeur-reject`);
            setSuccessMessage('Ticket refusé et remis en cours');
            fetchTickets(); // Rafraîchir la liste
        } catch (err) {
            setError('Erreur lors du refus du ticket');
        }
    };

    if (loading) return <div>Chargement...</div>;
    if (error) return <div>{error}</div>;

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Tickets terminés</h1>
                </div>
                {successMessage && (
                    <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg">
                        {successMessage}
                    </div>
                )}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titre</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date de création</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date de fin</th>
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
                                                    ? new Date(ticket.DateFinReelle.replace(' ', 'T')).toLocaleDateString('fr-FR', {
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
                                            <div className="flex space-x-2">
                                                <Link
                                                    to={`/tickets/${ticket.id}`}
                                                    className="text-indigo-600 hover:text-indigo-900"
                                                >
                                                    Voir les détails
                                                </Link>
                                                {ticket.statut?.designation === 'Terminé' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleApprove(ticket.id)}
                                                            className="text-green-600 hover:text-green-900"
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
                                            </div>
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

export default CompletedTicketsPage; 