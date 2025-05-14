// import React, { useState, useEffect } from 'react';
// import axios from '../utils/axios';
// import Layout from '../components/Layout';
// import { Link } from 'react-router-dom';
// import { FaUser, FaBuilding, FaMapMarkerAlt, FaCalendarAlt } from 'react-icons/fa';

// const ResponsableTicketList = () => {
//   const [tickets, setTickets] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');
//   const [filters, setFilters] = useState({
//     titre: '',
//     description: '',
//     statut: '',
//     priorite: '',
//     demandeur: '',
//     societe: '',
//     emplacement: '',
//     date_creation: ''
//   });

//   const [filterOptions, setFilterOptions] = useState({
//     statuts: [],
//     priorites: [],
//     societes: [],
//     emplacements: [],
//     demandeurs: []
//   });

//   const fetchTickets = async () => {
//     try {
//       setLoading(true);
//       const response = await axios.get('/api/tickets');
//       setTickets(response.data);
//       setError('');
//     } catch (err) {
//       setError('Erreur lors du chargement des tickets');
//       console.error('Erreur:', err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchTickets();
//   }, []);

//   useEffect(() => {
//     const fetchFilterOptions = async () => {
//       try {
//         const [statutsRes, prioritesRes, societesRes, emplacementsRes, demandeursRes] = await Promise.all([
//           axios.get('/api/statuts'),
//           axios.get('/api/priorites'),
//           axios.get('/api/societes'),
//           axios.get('/api/emplacements'),
//           axios.get('/api/demandeurs')
//         ]);

//         setFilterOptions({
//           statuts: statutsRes.data,
//           priorites: prioritesRes.data,
//           societes: societesRes.data,
//           emplacements: emplacementsRes.data,
//           demandeurs: demandeursRes.data
//         });
//       } catch (err) {
//         console.error('Erreur lors du chargement des options de filtre:', err);
//       }
//     };

//     fetchFilterOptions();
//   }, []);

//   const handleFilterChange = (e) => {
//     const { name, value } = e.target;
//     setFilters(prev => ({
//       ...prev,
//       [name]: value
//     }));
//   };

//   const clearFilters = () => {
//     setFilters({
//       titre: '',
//       description: '',
//       statut: '',
//       priorite: '',
//       demandeur: '',
//       societe: '',
//       emplacement: '',
//       date_creation: ''
//     });
//   };

//   const getStatusBadge = (status) => {
//     const statusInfo = filterOptions.statuts.find(s => s.id === status) || { designation: 'Inconnu' };
//     const colorMap = {
//       'Nouveau': 'bg-blue-100 text-blue-800',
//       'En cours': 'bg-yellow-100 text-yellow-800',
//       'En attente': 'bg-orange-100 text-orange-800',
//       'Résolu': 'bg-green-100 text-green-800',
//       'Fermé': 'bg-gray-100 text-gray-800'
//     };

//     return (
//       <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorMap[statusInfo.designation] || 'bg-gray-100 text-gray-800'}`}>
//         {statusInfo.designation}
//       </span>
//     );
//   };

//   const getPriorityBadge = (priority) => {
//     const priorityInfo = filterOptions.priorites.find(p => p.id === priority) || { designation: 'Non définie' };
//     const colorMap = {
//       'Basse': 'bg-green-100 text-green-800',
//       'Moyenne': 'bg-yellow-100 text-yellow-800',
//       'Haute': 'bg-orange-100 text-orange-800',
//       'Urgente': 'bg-red-100 text-red-800'
//     };

//     return (
//       <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorMap[priorityInfo.designation] || 'bg-gray-100 text-gray-800'}`}>
//         {priorityInfo.designation}
//       </span>
//     );
//   };

//   const filteredTickets = tickets.filter(ticket => {
//     return (
//       ticket.titre.toLowerCase().includes(filters.titre.toLowerCase()) &&
//       (ticket.description?.toLowerCase().includes(filters.description.toLowerCase()) || !filters.description) &&
//       (ticket.statut?.id?.toString() === filters.statut || !filters.statut) &&
//       (ticket.priorite?.id?.toString() === filters.priorite || !filters.priorite) &&
//       (ticket.demandeur?.id?.toString() === filters.demandeur || !filters.demandeur) &&
//       (ticket.societe?.id?.toString() === filters.societe || !filters.societe) &&
//       (ticket.emplacement?.id?.toString() === filters.emplacement || !filters.emplacement) &&
//       (new Date(ticket.date_creation).toLocaleDateString('fr-FR').includes(filters.date_creation) || !filters.date_creation)
//     );
//   });

//   const renderTicketCard = (ticket) => (
//     <div key={ticket.id || Math.random()} className="bg-white rounded-lg shadow-md p-6 mb-4 hover:shadow-lg transition-shadow duration-200">
//       <div className="flex justify-between items-start mb-4">
//         <div>
//           <h3 className="text-lg font-semibold text-gray-900">{ticket.titre}</h3>
          
//           <div className="flex items-center mt-2 space-x-4">
//             {getStatusBadge(ticket.statut?.id)}
//             {getPriorityBadge(ticket.priorite?.id)}
//           </div>
//         </div>
//         <Link
//           to={`/tickets/${ticket.id}`}
//           className="text-blue-600 hover:text-blue-800 font-medium"
//         >
//           Voir détails
//         </Link>
//       </div>

//       <div className="flex flex-wrap items-center gap-x-8 gap-y-2 mt-4">
//         <div className="flex items-center space-x-1">
//           <FaUser className="text-blue-400" />
//           <span className="text-xs text-gray-500">Créé par</span>
//           <span className="font-medium text-gray-900">{ticket.utilisateur?.designation || 'Créateur inconnu'}</span>
//         </div>
//         <div className="flex items-center space-x-1">
//           <FaUser className="text-gray-400" />
//           <span className="text-xs text-gray-500">Demandeur</span>
//           <span className="font-medium text-gray-900">{ticket.demandeur?.designation || 'Non spécifié'}</span>
//         </div>
//         <div className="flex items-center space-x-1">
//           <FaBuilding className="text-gray-400" />
//           <span className="text-xs text-gray-500">Société</span>
//           <span className="font-medium text-gray-900">{ticket.societe?.designation || 'Non spécifiée'}</span>
//         </div>
//         <div className="flex items-center space-x-1">
//           <FaMapMarkerAlt className="text-gray-400" />
//           <span className="text-xs text-gray-500">Emplacement</span>
//           <span className="font-medium text-gray-900">{ticket.emplacement?.designation || 'Non spécifié'}</span>
//         </div>
//         <div className="flex items-center space-x-1">
//           <FaCalendarAlt className="text-gray-400" />
//           <span className="text-xs text-gray-500">Date de début</span>
//           <span className="font-medium text-gray-900">{ticket.date_debut ? new Date(ticket.date_debut).toLocaleString('fr-FR') : '-'}</span>
//         </div>
//       </div>

//       {ticket.description && (
//         <div className="mt-4">
//           <p className="text-sm text-gray-500">Description</p>
//           <p className="text-sm text-gray-900 mt-1">{ticket.description}</p>
//         </div>
//       )}
//     </div>
//   );

//   if (loading) {
//     return (
//       <Layout>
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//           <div className="animate-pulse space-y-4">
//             {[1, 2, 3].map((i) => (
//               <div key={i} className="bg-white rounded-lg shadow-md p-6">
//                 <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
//                 <div className="h-4 bg-gray-200 rounded w-1/2"></div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </Layout>
//     );
//   }

//   return (
//     <Layout>
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         <div className="flex justify-between items-center mb-6">
//           <div>
//             <h1 className="text-2xl font-bold text-gray-900">Vue Responsable - Tous les Tickets</h1>
//             <p className="mt-1 text-sm text-gray-500">
//               {filteredTickets.length} ticket{filteredTickets.length > 1 ? 's' : ''} trouvé{filteredTickets.length > 1 ? 's' : ''}
//             </p>
//           </div>
//           <div className="flex items-center space-x-4">
//             <button
//               onClick={fetchTickets}
//               className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
//             >
//               <svg 
//                 className={`h-5 w-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} 
//                 xmlns="http://www.w3.org/2000/svg" 
//                 fill="none" 
//                 viewBox="0 0 24 24" 
//                 stroke="currentColor"
//               >
//                 <path 
//                   strokeLinecap="round" 
//                   strokeLinejoin="round" 
//                   strokeWidth={2} 
//                   d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
//                 />
//               </svg>
//               <span className="ml-2">Rafraîchir</span>
//             </button>
//           </div>
//         </div>

//         {error && (
//           <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
//             {error}
//           </div>
//         )}

//         <div className="space-y-4">
//           {filteredTickets.map(ticket => renderTicketCard(ticket))}
//         </div>
//       </div>
//     </Layout>
//   );
// };

// export default ResponsableTicketList; 