import React, { useState, useEffect, useCallback } from 'react';
import axios from '../utils/axios';
import Layout from '../components/Layout';
import { FaSyncAlt, FaEye, FaUserCheck, FaTicketAlt } from 'react-icons/fa';

const TicketsValidatedByDirectorPage = () => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [error, setError] = useState('');
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignTicketId, setAssignTicketId] = useState(null);
    const [assignForm, setAssignForm] = useState({
        DateDebut: '',
        DateFinPrevue: '',
        priorityId: '',
        executantId: '',
        emplacementId: '',
        categorieId: ''
    });
    const [assignLoading, setAssignLoading] = useState(false);
    const [assignError, setAssignError] = useState('');
    const [executants, setExecutants] = useState([]);
    const [priorites, setPriorites] = useState([]);
    const [loadingOptions, setLoadingOptions] = useState(false);
    const [emplacements, setEmplacements] = useState([]);
    const [categories, setCategories] = useState([]);

    const fetchTickets = useCallback(async () => {
        try {
            setError('');
            const response = await axios.get('/api/tickets', {
                params: {
                    statut: 'Validé par directeur'
                }
            });
            setTickets(response.data.data || response.data);
        } catch (error) {
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

    const openDetailModal = (ticket) => {
        setSelectedTicket(ticket);
        setShowDetailModal(true);
    };

    const closeDetailModal = () => {
        setSelectedTicket(null);
        setShowDetailModal(false);
    };

    const openAssignModal = (ticketId) => {
        setAssignTicketId(ticketId);
        setShowAssignModal(true);
        setAssignForm({ 
            DateDebut: '', 
            DateFinPrevue: '', 
            priorityId: '', 
            executantId: '',
            emplacementId: '',
            categorieId: ''
        });
        setAssignError('');
        setLoadingOptions(true);
        Promise.all([
            axios.get('/api/priorites'),
            axios.get('/api/executants'),
            axios.get('/api/emplacements'),
            axios.get('/api/categories')
        ]).then(([priorRes, execRes, empRes, catRes]) => {
            setPriorites(priorRes.data);
            setExecutants(execRes.data);
            setEmplacements(empRes.data);
            setCategories(catRes.data);
        }).catch(() => {
            setAssignError('Erreur lors du chargement des options');
        }).finally(() => setLoadingOptions(false));
    };

    const closeAssignModal = () => {
        setShowAssignModal(false);
        setAssignTicketId(null);
        setAssignForm({ 
            DateDebut: '', 
            DateFinPrevue: '', 
            priorityId: '', 
            executantId: '',
            emplacementId: '',
            categorieId: ''
        });
        setAssignError('');
    };

    const handleAssignChange = (e) => {
        const { name, value } = e.target;
        setAssignForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleAssignSubmit = async (e) => {
        e.preventDefault();
        setAssignLoading(true);
        setAssignError('');
        try {
            if (!assignForm.DateDebut || !assignForm.DateFinPrevue || !assignForm.priorityId || !assignForm.executantId || !assignForm.emplacementId || !assignForm.categorieId) {
                setAssignError('Tous les champs sont obligatoires.');
                setAssignLoading(false);
                return;
            }
            await axios.post(`/api/tickets/${assignTicketId}/assign-to-executant`, {
                DateDebut: assignForm.DateDebut,
                DateFinPrevue: assignForm.DateFinPrevue,
                priorityId: assignForm.priorityId,
                executantId: assignForm.executantId,
                emplacementId: assignForm.emplacementId,
                categorieId: assignForm.categorieId
            });
            closeAssignModal();
            fetchTickets();
        } catch (err) {
            setAssignError(err.response?.data?.message || 'Erreur lors de l\'assignation');
        } finally {
            setAssignLoading(false);
        }
    };

    const handleAssign = (ticketId) => {
        openAssignModal(ticketId);
    };

    const formatDate = (dateValue) => {
        if (!dateValue) return 'Non définie';
        return new Date(dateValue).toLocaleDateString('fr-FR');
    };

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">
                        Tickets validés par le directeur
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
                            Aucun ticket validé par le directeur
                        </h3>
                        <p className="text-gray-500">
                            Tous les tickets ont été traités ou sont en attente de validation.
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
                                                onClick={() => handleAssign(ticket.id)}
                                                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors flex items-center space-x-1"
                                            >
                                                <FaUserCheck size={12} />
                                                <span>Assigner</span>
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Modal de détails */}
            {showDetailModal && selectedTicket && (
                <div className="fixed left-0 top-0 w-screen h-screen bg-gray-900 bg-opacity-60 flex items-center justify-center z-50">
                    <div className="relative p-6 border w-full max-w-lg shadow-2xl rounded-xl bg-white">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">
                                Détails du ticket
                            </h3>
                            <button
                                onClick={closeDetailModal}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ×
                            </button>
                        </div>
                        <div className="space-y-3">
                            {selectedTicket.Titre && (
                                <div>
                                    <span className="font-semibold text-gray-600">Titre :</span>
                                    <span className="ml-2 text-gray-900">{selectedTicket.Titre}</span>
                                </div>
                            )}
                            {selectedTicket.Description && (
                                <div>
                                    <span className="font-semibold text-gray-600">Description :</span>
                                    <span className="ml-2 text-gray-900 whitespace-pre-wrap">{selectedTicket.Description}</span>
                                </div>
                            )}
                            {selectedTicket.DateCreation && (
                                <div>
                                    <span className="font-semibold text-gray-600">Date de création :</span>
                                    <span className="ml-2 text-gray-900">
                                        {new Date(selectedTicket.DateCreation).toLocaleDateString('fr-FR')}
                                    </span>
                                </div>
                            )}
                            {selectedTicket.demandeur?.designation && (
                                <div>
                                    <span className="font-semibold text-gray-600">Demandeur :</span>
                                    <span className="ml-2 text-gray-900">{selectedTicket.demandeur.designation}</span>
                                </div>
                            )}
                            {selectedTicket.demandeur?.service?.designation && (
                                <div>
                                    <span className="font-semibold text-gray-600">Service :</span>
                                    <span className="ml-2 text-gray-900">{selectedTicket.demandeur.service.designation}</span>
                                </div>
                            )}
                            {selectedTicket.typeDemande?.designation && (
                                <div>
                                    <span className="font-semibold text-gray-600">Type de demande :</span>
                                    <span className="ml-2 text-gray-900">{selectedTicket.typeDemande.designation}</span>
                                </div>
                            )}
                            {selectedTicket.categorie?.designation && (
                                <div>
                                    <span className="font-semibold text-gray-600">Catégorie :</span>
                                    <span className="ml-2 text-gray-900">{selectedTicket.categorie.designation}</span>
                                </div>
                            )}
                            {selectedTicket.emplacement?.designation && (
                                <div>
                                    <span className="font-semibold text-gray-600">Emplacement :</span>
                                    <span className="ml-2 text-gray-900">{selectedTicket.emplacement.designation}</span>
                                </div>
                            )}
                            {selectedTicket.priorite?.designation && (
                                <div>
                                    <span className="font-semibold text-gray-600">Priorité :</span>
                                    <span className="ml-2 text-gray-900">{selectedTicket.priorite.designation}</span>
                                </div>
                            )}
                            {selectedTicket.DateDebut && (
                                <div>
                                    <span className="font-semibold text-gray-600">Date de début :</span>
                                    <span className="ml-2 text-gray-900">
                                        {new Date(selectedTicket.DateDebut).toLocaleDateString('fr-FR')}
                                    </span>
                                </div>
                            )}
                            {selectedTicket.DateFinPrevue && (
                                <div>
                                    <span className="font-semibold text-gray-600">Date de fin prévue :</span>
                                    <span className="ml-2 text-gray-900">
                                        {new Date(selectedTicket.DateFinPrevue).toLocaleDateString('fr-FR')}
                                    </span>
                                </div>
                            )}
                            {selectedTicket.executant?.designation && (
                                <div>
                                    <span className="font-semibold text-gray-600">Exécutant :</span>
                                    <span className="ml-2 text-gray-900">{selectedTicket.executant.designation}</span>
                                </div>
                            )}
                            {selectedTicket.Commentaire && (
                                <div>
                                    <span className="font-semibold text-gray-600">Commentaire :</span>
                                    <span className="ml-2 text-gray-900">{selectedTicket.Commentaire}</span>
                                </div>
                            )}
                        </div>
                        {selectedTicket.attachment_path && (
                            <div className="mt-6">
                                <h4 className="font-medium text-gray-900 mb-3">Pièce jointe</h4>
                                <a
                                    href={`/storage/${selectedTicket.attachment_path}`}
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
                                onClick={closeDetailModal}
                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showAssignModal && (
                <div className="fixed left-0 top-0 w-screen h-screen bg-gray-900 bg-opacity-60 flex items-center justify-center z-50">
                    <div className="relative p-6 border w-full max-w-md shadow-2xl rounded-xl bg-white">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">Assigner le ticket</h3>
                            <button onClick={closeAssignModal} className="text-gray-400 hover:text-gray-600">×</button>
                        </div>
                        <form onSubmit={handleAssignSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Date de début</label>
                                <input type="date" name="DateDebut" value={assignForm.DateDebut} onChange={handleAssignChange} className="mt-1 block w-full border rounded px-3 py-2" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Date de fin prévue</label>
                                <input type="date" name="DateFinPrevue" value={assignForm.DateFinPrevue} onChange={handleAssignChange} className="mt-1 block w-full border rounded px-3 py-2" required min={assignForm.DateDebut} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Priorité</label>
                                {loadingOptions ? (
                                    <div className="text-gray-500 text-sm mt-1">Chargement...</div>
                                ) : (
                                    <select name="priorityId" value={assignForm.priorityId} onChange={handleAssignChange} className="mt-1 block w-full border rounded px-3 py-2" required>
                                        <option value="">Sélectionnez une priorité</option>
                                        {priorites.map((p) => (
                                            <option key={p.id} value={p.id}>{p.designation}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Exécutant</label>
                                {loadingOptions ? (
                                    <div className="text-gray-500 text-sm mt-1">Chargement...</div>
                                ) : (
                                    <select name="executantId" value={assignForm.executantId} onChange={handleAssignChange} className="mt-1 block w-full border rounded px-3 py-2" required>
                                        <option value="">Sélectionnez un exécutant</option>
                                        {executants.map((e) => (
                                            <option key={e.id} value={e.id}>{e.designation}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Emplacement</label>
                                {loadingOptions ? (
                                    <div className="text-gray-500 text-sm mt-1">Chargement...</div>
                                ) : (
                                    <select name="emplacementId" value={assignForm.emplacementId} onChange={handleAssignChange} className="mt-1 block w-full border rounded px-3 py-2" required>
                                        <option value="">Sélectionnez un emplacement</option>
                                        {emplacements.map((emp) => (
                                            <option key={emp.id} value={emp.id}>{emp.designation}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Catégorie</label>
                                {loadingOptions ? (
                                    <div className="text-gray-500 text-sm mt-1">Chargement...</div>
                                ) : (
                                    <select name="categorieId" value={assignForm.categorieId} onChange={handleAssignChange} className="mt-1 block w-full border rounded px-3 py-2" required>
                                        <option value="">Sélectionnez une catégorie</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>{cat.designation}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            {assignError && <div className="text-red-600 text-sm mt-2">{assignError}</div>}
                            <div className="flex justify-end space-x-3 mt-6">
                                <button type="button" onClick={closeAssignModal} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors">Annuler</button>
                                <button type="submit" disabled={assignLoading} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                                    {assignLoading ? 'Assignation...' : 'Assigner'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default TicketsValidatedByDirectorPage; 