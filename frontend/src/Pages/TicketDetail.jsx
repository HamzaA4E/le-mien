// import React, { useState, useEffect } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import { format } from 'date-fns';
// import { fr } from 'date-fns/locale';

// const TicketDetail = () => {
//     const { id } = useParams();
//     const navigate = useNavigate();
//     const [ticket, setTicket] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);

//     useEffect(() => {
//         const fetchTicket = async () => {
//             try {
//                 const response = await axios.get(`/api/tickets/${id}`);
//                 setTicket(response.data);
//                 setLoading(false);
//             } catch (err) {
//                 setError('Erreur lors du chargement du ticket');
//                 setLoading(false);
//             }
//         };

//         fetchTicket();
//     }, [id]);

//     const formatDate = (dateString) => {
//         if (!dateString) return 'Non spécifiée';
//         return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
//     };

//     const getStatusColor = (status) => {
//         switch (status) {
//             case 'En cours':
//                 return 'bg-blue-100 text-blue-800';
//             case 'En instance':
//                 return 'bg-yellow-100 text-yellow-800';
//             case 'Clôturé':
//                 return 'bg-green-100 text-green-800';
//             default:
//                 return 'bg-gray-100 text-gray-800';
//         }
//     };

//     const getPriorityColor = (priority) => {
//         switch (priority) {
//             case 'Haute':
//                 return 'bg-red-100 text-red-800';
//             case 'Moyenne':
//                 return 'bg-yellow-100 text-yellow-800';
//             case 'Basse':
//                 return 'bg-green-100 text-green-800';
//             default:
//                 return 'bg-gray-100 text-gray-800';
//         }
//     };

//     if (loading) return <div className="flex justify-center items-center h-screen">Chargement...</div>;
//     if (error) return <div className="text-red-500 text-center">{error}</div>;
//     if (!ticket) return <div className="text-center">Ticket non trouvé</div>;

//     return (
//         <div className="container mx-auto px-4 py-8">
//             <div className="flex justify-between items-center mb-6">
//                 <h1 className="text-2xl font-bold">Détails du Ticket #{ticket.id}</h1>
//                 <button
//                     onClick={() => navigate('/tickets')}
//                     className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
//                 >
//                     Retour
//                 </button>
//             </div>

//             <div className="bg-white rounded-lg shadow-md p-6">
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                     <div>
//                         <h2 className="text-xl font-semibold mb-4">Informations Générales</h2>
//                         <div className="space-y-4">
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-600">Statut</label>
//                                 <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(ticket.statut?.designation)}`}>
//                                     {ticket.statut?.designation || 'Non spécifié'}
//                                 </span>
//                             </div>
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-600">Priorité</label>
//                                 <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(ticket.priorite?.designation)}`}>
//                                     {ticket.priorite?.designation || 'Non spécifiée'}
//                                 </span>
//                             </div>
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-600">Catégorie</label>
//                                 <p className="mt-1">{ticket.categorie?.designation || 'Non spécifiée'}</p>
//                             </div>
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-600">Type de demande</label>
//                                 <p className="mt-1">{ticket.type_demande?.designation || 'Non spécifié'}</p>
//                             </div>
//                         </div>
//                     </div>

//                     <div>
//                         <h2 className="text-xl font-semibold mb-4">Informations du Demandeur</h2>
//                         <div className="space-y-4">
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-600">Société</label>
//                                 <p className="mt-1">{ticket.societe?.designation || 'Non spécifiée'}</p>
//                             </div>
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-600">Emplacement</label>
//                                 <p className="mt-1">{ticket.emplacement?.designation || 'Non spécifié'}</p>
//                             </div>
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-600">Demandeur</label>
//                                 <p className="mt-1">{ticket.demandeur?.nom || 'Non spécifié'}</p>
//                             </div>
//                         </div>
//                     </div>
//                 </div>

//                 <div className="mt-8">
//                     <h2 className="text-xl font-semibold mb-4">Description</h2>
//                     <div className="bg-gray-50 p-4 rounded">
//                         <p className="whitespace-pre-wrap">{ticket.description || 'Aucune description'}</p>
//                     </div>
//                 </div>

//                 <div className="mt-8">
//                     <h2 className="text-xl font-semibold mb-4">Dates</h2>
//                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                         <div>
//                             <label className="block text-sm font-medium text-gray-600">Date de création</label>
//                             <p className="mt-1">{formatDate(ticket.date_creation)}</p>
//                         </div>
//                         <div>
//                             <label className="block text-sm font-medium text-gray-600">Date de début</label>
//                             <p className="mt-1">{formatDate(ticket.date_debut)}</p>
//                         </div>
//                         <div>
//                             <label className="block text-sm font-medium text-gray-600">Date de fin prévue</label>
//                             <p className="mt-1">{formatDate(ticket.date_fin_prevue)}</p>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default TicketDetail; 