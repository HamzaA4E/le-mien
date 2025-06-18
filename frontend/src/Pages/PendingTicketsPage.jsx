import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from '../utils/axios';
import Layout from '../components/Layout';
import { FaSyncAlt, FaEye, FaTicketAlt, FaTimesCircle } from 'react-icons/fa';

// Composant Modal d'approbation
const ApproveModal = ({ isOpen, onClose, onApprove, ticket, executants, loadingExecutants, typeDemandes, loadingTypeDemandes }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [executantId, setExecutantId] = useState('');
    const [priorityId, setPriorityId] = useState('');
    const [typeDemandeId, setTypeDemandeId] = useState('');
    const [priorities, setPriorities] = useState([]);
    const [loadingPriorities, setLoadingPriorities] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (ticket && ticket.statut?.designation !== 'Nouveau') {
            // Charger les priorités seulement si ce n'est pas un ticket "Nouveau"
            const fetchPriorities = async () => {
                try {
                    const response = await axios.get('/api/priorites');
                    setPriorities(response.data);
                } catch (error) {
                    console.error('Erreur lors du chargement des priorités:', error);
                } finally {
                    setLoadingPriorities(false);
                }
            };
            fetchPriorities();
        }
    }, [ticket]);

    useEffect(() => {
        if (ticket && ticket.typeDemande) {
            setTypeDemandeId(ticket.typeDemande.id);
        }
    }, [ticket]);

    const handleSubmit = useCallback(() => {
        if (ticket && ticket.statut?.designation === 'Nouveau') {
            if (!typeDemandeId) {
                setError('Veuillez sélectionner le type de demande.');
                return;
            }
            onApprove(ticket.id, null, null, null, null, typeDemandeId, null, null);
            return;
        }
        if (!startDate || !endDate || !executantId || !priorityId) {
            setError('Veuillez renseigner tous les champs obligatoires.');
            return;
        }
        // Formater les dates au format YYYY-MM-DD
        const formattedStartDate = new Date(startDate).toISOString().split('T')[0];
        const formattedEndDate = new Date(endDate).toISOString().split('T')[0];
        if (new Date(formattedEndDate) <= new Date(formattedStartDate)) {
            setError('La date de fin prévue doit être postérieure à la date de début.');
            return;
        }
        onApprove(ticket.id, formattedStartDate, formattedEndDate, executantId, priorityId, null, null, null);
    }, [startDate, endDate, executantId, priorityId, ticket, typeDemandeId, onApprove]);

    if (!isOpen || !ticket) return null;

    // Compter le nombre de champs affichés
    const resumeFieldsCount = [
        ticket?.Titre,
        ticket?.demandeur?.designation,
        ticket?.Description,
        ticket?.demandeur?.service?.designation,
        ticket?.categorie?.designation,
        ticket?.emplacement?.designation,
        ticket?.priorite?.designation,
        ticket?.DateDebut,
        ticket?.DateFinPrevue,
        ticket?.Commentaire
    ].filter(Boolean).length;

    const modalWidthClass = resumeFieldsCount <= 5 ? 'w-72' : 'w-96';

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
            <div className={`relative p-5 border ${modalWidthClass} shadow-lg rounded-md bg-white`}>
                <div className="mt-3 text-center">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Approuver le ticket</h3>
                    <div className="mt-2 px-7 py-3">
                        {ticket.statut?.designation === 'Nouveau' ? (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700">Type de demande</label>
                                {loadingTypeDemandes ? (
                                    <div className="mt-1 text-sm text-gray-500">Chargement des types de demande...</div>
                                ) : typeDemandes && typeDemandes.length > 0 ? (
                                    <select
                                        value={typeDemandeId}
                                        onChange={e => setTypeDemandeId(e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    >
                                        <option value="">Sélectionnez un type</option>
                                        {typeDemandes.map(type => (
                                            <option key={type.id} value={type.id}>{type.designation}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="mt-1 text-sm text-red-500">Aucun type de demande disponible</div>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700">Date de début</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700">Date de fin prévue</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        min={startDate || new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700">Exécutant</label>
                                    {loadingExecutants ? (
                                        <div className="mt-1 text-sm text-gray-500">Chargement des exécutants...</div>
                                    ) : executants && executants.length > 0 ? (
                                        <select
                                            value={executantId}
                                            onChange={(e) => setExecutantId(e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        >
                                            <option value="">Sélectionnez un exécutant</option>
                                            {executants.map((executant) => (
                                                <option key={executant.id} value={executant.id}>
                                                    {executant.designation}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="mt-1 text-sm text-red-500">Aucun exécutant disponible</div>
                                    )}
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700">Priorité</label>
                                    {loadingPriorities ? (
                                        <div className="mt-1 text-sm text-gray-500">Chargement des priorités...</div>
                                    ) : priorities && priorities.length > 0 ? (
                                        <select
                                            value={priorityId}
                                            onChange={(e) => setPriorityId(e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        >
                                            <option value="">Sélectionnez une priorité</option>
                                            {priorities.map((priority) => (
                                                <option key={priority.id} value={priority.id}>
                                                    {priority.designation}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="mt-1 text-sm text-red-500">Aucune priorité disponible</div>
                                    )}
                                </div>
                            </>
                        )}
                        {error && (
                            <div className="text-red-600 text-sm mt-2">
                                {error}
                            </div>
                        )}
                    </div>
                    <div className="items-center px-4 py-3">
                        <button
                            onClick={handleSubmit}
                            className="px-4 py-2 bg-green-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-300"
                        >
                            Confirmer
                        </button>
                        <button
                            onClick={onClose}
                            className="ml-3 px-4 py-2 bg-gray-100 text-gray-700 text-base font-medium rounded-md shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
                        >
                            Annuler
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Composant Modal de refus
const RejectModal = ({ isOpen, onClose, onReject, ticketId }) => {
    const [rejectionReason, setRejectionReason] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = useCallback(() => {
        if (!rejectionReason.trim()) {
            setError('Veuillez indiquer la raison du refus.');
            return;
        }
        onReject(ticketId, rejectionReason);
    }, [rejectionReason, ticketId, onReject]);

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
const DetailModal = ({ isOpen, onClose, ticket, onApprove, onReject, loading }) => {
    if (!isOpen) return null;

    // Trouver le dernier report de type 'rejet'
    const lastRejectionReport = ticket?.reports?.findLast(report => report.type === 'rejet');

    // Compter le nombre de champs affichés
    const resumeFieldsCount = [
        ticket?.Titre,
        ticket?.demandeur?.designation,
        ticket?.Description,
        ticket?.demandeur?.service?.designation,
        ticket?.categorie?.designation,
        ticket?.emplacement?.designation,
        ticket?.priorite?.designation,
        ticket?.DateDebut,
        ticket?.DateFinPrevue,
        ticket?.Commentaire
    ].filter(Boolean).length;

    const modalWidthClass = resumeFieldsCount <= 5 ? 'w-72' : 'w-96';

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
            <div className={`relative bg-white p-8 rounded-xl shadow-xl ${modalWidthClass}`}>
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
                        <div className="mb-6">
                            {ticket.Titre && (
                                <div className="mb-2">
                                    <span className="font-semibold text-gray-600">Titre :</span>
                                    <span className="ml-2 text-gray-900">{ticket.Titre}</span>
                                </div>
                            )}
                            {ticket.demandeur?.designation && (
                                <div className="mb-2">
                                    <span className="font-semibold text-gray-600">Demandeur :</span>
                                    <span className="ml-2 text-gray-900">{ticket.demandeur.designation}</span>
                                </div>
                            )}
                            {ticket.Description && (
                                <div className="mb-2">
                                    <span className="font-semibold text-gray-600">Description :</span>
                                    <span className="ml-2 text-gray-900">{ticket.Description}</span>
                                </div>
                            )}
                            {ticket.demandeur?.service?.designation && (
                                <div className="mb-2">
                                    <span className="font-semibold text-gray-600">Service :</span>
                                    <span className="ml-2 text-gray-900">{ticket.demandeur.service.designation}</span>
                                </div>
                            )}
                            {ticket.categorie?.designation && (
                                <div className="mb-2">
                                    <span className="font-semibold text-gray-600">Catégorie :</span>
                                    <span className="ml-2 text-gray-900">{ticket.categorie.designation}</span>
                                </div>
                            )}
                            {ticket.emplacement?.designation && (
                                <div className="mb-2">
                                    <span className="font-semibold text-gray-600">Emplacement :</span>
                                    <span className="ml-2 text-gray-900">{ticket.emplacement.designation}</span>
                                </div>
                            )}
                            {ticket.priorite?.designation && (
                                <div className="mb-2">
                                    <span className="font-semibold text-gray-600">Priorité :</span>
                                    <span className="ml-2 text-gray-900">{ticket.priorite.designation}</span>
                                </div>
                            )}
                            {ticket.DateDebut && (
                                <div className="mb-2">
                                    <span className="font-semibold text-gray-600">Date de début :</span>
                                    <span className="ml-2 text-gray-900">{formatDate(ticket.DateDebut)}</span>
                                </div>
                            )}
                            {ticket.DateFinPrevue && (
                                <div className="mb-2">
                                    <span className="font-semibold text-gray-600">Date de fin :</span>
                                    <span className="ml-2 text-gray-900">{formatDate(ticket.DateFinPrevue)}</span>
                                </div>
                            )}
                            {ticket.Commentaire && (
                                <div className="mb-2">
                                    <span className="font-semibold text-gray-600">Commentaire :</span>
                                    <span className="ml-2 text-gray-900">{ticket.Commentaire}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-3 mt-2">
                            {/* Les boutons Approuver/Refuser ne devraient être visibles que pour les tickets non refusés en attente */}
                            {ticket.statut?.designation !== 'Refusé' && (
                                <>
                                    <button
                                        onClick={() => { onClose(); onApprove(ticket.id); }}
                                        className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 font-semibold shadow-sm transition"
                                    >
                                        Approuver
                                    </button>
                                    <button
                                        onClick={() => { onClose(); onReject(ticket.id); }}
                                        className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 font-semibold shadow-sm transition"
                                    >
                                        Refuser
                                    </button>
                                </>
                             )}
                        </div>
                    </>
                ) : (
                    <div className="text-center text-red-600">Erreur lors du chargement du ticket.</div>
                )}
            </div>
        </div>
    );
};

// Fonction utilitaire pour formater les dates
const formatDate = (dateValue) => {
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
};

const PendingTicketsPage = () => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [executants, setExecutants] = useState([]);
    const [loadingExecutants, setLoadingExecutants] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [showRejected, setShowRejected] = useState(false);
    const [spin, setSpin] = useState(false);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [approveTicketId, setApproveTicketId] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectTicketId, setRejectTicketId] = useState(null);
    const [lastRejectedTicketId, setLastRejectedTicketId] = useState(null);
    const [hasMoreRejected, setHasMoreRejected] = useState(true);
    const [processedTicketIds] = useState(new Set());
    const [typeDemandes, setTypeDemandes] = useState([]);
    const [loadingTypeDemandes, setLoadingTypeDemandes] = useState(true);

    const fetchTickets = useCallback(async () => {
        setSpin(true);
        try {
            if (showRejected) {
                // Réinitialiser l'état pour les tickets refusés
                setTickets([]);
                setLastRejectedTicketId(null);
                setHasMoreRejected(true);
                processedTicketIds.clear();
                await fetchNextRejectedTicket();
            } else {
                const response = await axios.get('/api/tickets/pending', {
                    params: { show_rejected: false }
                });
                setTickets(response.data);
            }
            setError(null);
        } catch (err) {
            setError('Erreur lors du chargement des tickets');
            console.error('Erreur:', err);
        } finally {
            setLoading(false);
            setTimeout(() => setSpin(false), 600);
        }
    }, [showRejected, processedTicketIds]);

    const fetchNextRejectedTicket = useCallback(async () => {
        if (!hasMoreRejected) return;

        try {
            const response = await axios.get('/api/tickets/next-rejected', {
                params: { last_ticket_id: lastRejectedTicketId }
            });
            
            if (response.data) {
                // Check if we've already processed this ticket ID
                if (!processedTicketIds.has(response.data.id)) {
                    setTickets(prevTickets => [...prevTickets, response.data]);
                    setLastRejectedTicketId(response.data.id);
                    processedTicketIds.add(response.data.id);
                } else {
                    // If we've already processed this ticket, mark that there are no more tickets
                    setHasMoreRejected(false);
                }
            } else {
                setHasMoreRejected(false);
            }
        } catch (err) {
            if (err.response?.status === 404) {
                setHasMoreRejected(false);
            } else {
                console.error('Erreur lors du chargement du ticket refusé:', err);
            }
        }
    }, [lastRejectedTicketId, hasMoreRejected, processedTicketIds]);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    // Observer pour charger plus de tickets quand on atteint le bas de la page
    useEffect(() => {
        if (!showRejected || !hasMoreRejected) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    fetchNextRejectedTicket();
                }
            },
            { threshold: 0.1 }
        );

        const loadMoreTrigger = document.getElementById('load-more-trigger');
        if (loadMoreTrigger) {
            observer.observe(loadMoreTrigger);
        }

        return () => {
            if (loadMoreTrigger) {
                observer.unobserve(loadMoreTrigger);
            }
        };
    }, [showRejected, hasMoreRejected, fetchNextRejectedTicket]);

    const handleApprove = useCallback(async (ticketId, startDate, endDate, executantId, priorityId, typeDemandeId, categorieId, emplacementId) => {
        try {
            // Vérifier d'abord le statut du ticket
            const ticketResponse = await axios.get(`/api/tickets/${ticketId}`);
            const ticket = ticketResponse.data;

            if (!['En attente', 'Nouveau'].includes(ticket.statut?.designation)) {
                setErrorMessage('Seuls les tickets en attente ou nouveaux peuvent être approuvés.');
                return;
            }

            console.log('Sending approval data:', {
                DateDebut: startDate,
                DateFinPrevue: endDate,
                executantId: executantId,
                priorityId: priorityId,
                typeDemandeId: typeDemandeId,
                categorieId: categorieId,
                emplacementId: emplacementId
            });

            const response = await axios.post(`/api/tickets/${ticketId}/approve`, {
                DateDebut: startDate,
                DateFinPrevue: endDate,
                executantId: parseInt(executantId, 10),
                priorityId: parseInt(priorityId, 10),
                typeDemandeId: typeDemandeId ? parseInt(typeDemandeId, 10) : null,
                categorieId: categorieId ? parseInt(categorieId, 10) : null,
                emplacementId: emplacementId ? parseInt(emplacementId, 10) : null
            });

            if (response.data) {
                setSuccessMessage('Le ticket a été approuvé avec succès.');
                setErrorMessage('');
                setShowApproveModal(false);
                fetchTickets();
            }
        } catch (err) {
            console.error('Error approving ticket:', err.response?.data || err.message);
            setErrorMessage(err.response?.data?.message || "Une erreur est survenue lors de l'approbation du ticket.");
        }
    }, [fetchTickets]);

    const handleReject = useCallback(async (id, reason) => {
        try {
            await axios.post(`/api/tickets/${id}/reject`, {
                raison: reason
            });
            setSuccessMessage('Le ticket a été refusé avec succès.');
            setErrorMessage('');
            setShowRejectModal(false);
            fetchTickets();
        } catch (err) {
            setErrorMessage("Une erreur est survenue lors du refus du ticket.");
        }
    }, [fetchTickets]);

    const openDetailModal = useCallback(async (ticketId) => {
        setLoadingDetail(true);
        setShowDetailModal(true);
        try {
            const res = await axios.get(`/api/tickets/${ticketId}`);
            console.log('Ticket details API response:', res.data);
            setSelectedTicket(res.data);
        } catch (e) {
            console.error('Error fetching ticket details:', e);
            setSelectedTicket(null);
        }
        setLoadingDetail(false);
    }, []);

    const closeDetailModal = useCallback(() => {
        setShowDetailModal(false);
        setSelectedTicket(null);
    }, []);

    const openApproveModal = useCallback(async (id) => {
        try {
            // Charger le ticket complet avant d'ouvrir le modal
            const res = await axios.get(`/api/tickets/${id}`);
            setSelectedTicket(res.data);
            setApproveTicketId(id);
            setShowApproveModal(true);
        } catch (e) {
            setSelectedTicket(null);
            setApproveTicketId(null);
            setShowApproveModal(false);
            setErrorMessage("Erreur lors du chargement du ticket pour approbation.");
        }
    }, []);

    const closeApproveModal = useCallback(() => {
        setShowApproveModal(false);
        setApproveTicketId(null);
    }, []);

    const openRejectModal = useCallback((id) => {
        setRejectTicketId(id);
        setShowRejectModal(true);
    }, []);

    const closeRejectModal = useCallback(() => {
        setShowRejectModal(false);
        setRejectTicketId(null);
    }, []);

    const clearMessages = useCallback(() => {
        setSuccessMessage('');
        setErrorMessage('');
    }, []);

    // Effet pour nettoyer les messages après 5 secondes
    useEffect(() => {
        if (successMessage || errorMessage) {
            const timer = setTimeout(clearMessages, 5000);
            return () => clearTimeout(timer);
        }
    }, [successMessage, errorMessage, clearMessages]);

    // Charger les exécutants
    useEffect(() => {
        const fetchExecutants = async () => {
            try {
                console.log('Chargement des exécutants...');
                const response = await axios.get('/api/executants');
                console.log('Réponse des exécutants:', response.data);
                setExecutants(response.data);
            } catch (error) {
                console.error('Erreur lors du chargement des exécutants:', error);
            } finally {
                setLoadingExecutants(false);
            }
        };
        fetchExecutants();
    }, []);

    // Charger les types de demande
    useEffect(() => {
        const fetchTypeDemandes = async () => {
            try {
                console.log('Chargement des types de demande...');
                const response = await axios.get('/api/type-demandes');
                console.log('Réponse des types de demande:', response.data);
                setTypeDemandes(response.data);
            } catch (error) {
                console.error('Erreur lors du chargement des types de demande:', error);
            } finally {
                setLoadingTypeDemandes(false);
            }
        };
        fetchTypeDemandes();
    }, []);

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
                                    <tr key={`${ticket.id}-${showRejected ? 'rejected' : 'pending'}`}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{ticket.Titre}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{ticket.demandeur?.designation}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {formatDate(ticket.DateCreation)}
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
                                                        onClick={() => openRejectModal(ticket.id)}
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
                        {showRejected && hasMoreRejected && (
                            <div id="load-more-trigger" className="h-10 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            </div>
                        )}
                    </div>
                </div>

                <ApproveModal
                    isOpen={showApproveModal}
                    onClose={closeApproveModal}
                    onApprove={handleApprove}
                    ticket={selectedTicket}
                    executants={executants}
                    loadingExecutants={loadingExecutants}
                    typeDemandes={typeDemandes}
                    loadingTypeDemandes={loadingTypeDemandes}
                />

                <RejectModal
                    isOpen={showRejectModal}
                    onClose={closeRejectModal}
                    onReject={handleReject}
                    ticketId={rejectTicketId}
                />

                <DetailModal
                    isOpen={showDetailModal}
                    onClose={closeDetailModal}
                    ticket={selectedTicket}
                    onApprove={openApproveModal}
                    onReject={openRejectModal}
                    loading={loadingDetail}
                />
            </div>
        </Layout>
    );
};

export default PendingTicketsPage; 