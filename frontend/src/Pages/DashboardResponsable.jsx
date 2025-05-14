// import React, { useState, useEffect } from 'react';
// import axios from '../utils/axios';
// import Layout from '../components/Layout';
// import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
// import { Pie, Bar } from 'react-chartjs-2';

// ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

// const DashboardResponsable = () => {
//   const [stats, setStats] = useState({
//     total: 0,
//     en_cours: 0,
//     urgents: 0,
//     cloture: 0,
//     par_utilisateur: [],
//     par_statut: [],
//     par_priorite: [],
//     urgents_list: []
//   });
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');

//   const fetchStats = async () => {
//     try {
//       setLoading(true);
//       const response = await axios.get('/api/dashboard/responsable-stats');
//       setStats(response.data || {
//         total: 0,
//         en_cours: 0,
//         urgents: 0,
//         cloture: 0,
//         par_utilisateur: [],
//         par_statut: [],
//         par_priorite: [],
//         urgents_list: []
//       });
//       setError('');
//     } catch (err) {
//       setError('Erreur lors du chargement des statistiques');
//       console.error('Erreur:', err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchStats();
//   }, []);

//   if (loading) {
//     return (
//       <Layout>
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//           <h1 className="text-2xl font-bold text-gray-900 mb-6">Tableau de bord Responsable</h1>
//           <div className="animate-pulse grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
//             {[...Array(4)].map((_, i) => (
//               <div key={i} className="bg-white p-6 rounded-lg shadow">
//                 <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
//                 <div className="h-8 bg-gray-200 rounded w-1/2"></div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </Layout>
//     );
//   }

//   if (error) {
//     return (
//       <Layout>
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//           <div className="p-4 bg-red-100 text-red-700 rounded">{error}</div>
//         </div>
//       </Layout>
//     );
//   }

//   // Graphique tickets par utilisateur
//   const userData = {
//     labels: (stats.par_utilisateur || []).map(u => u.demandeur || ''),
//     datasets: [
//       {
//         label: 'Tickets par utilisateur',
//         data: (stats.par_utilisateur || []).map(u => u.total || 0),
//         backgroundColor: 'rgba(54, 162, 235, 0.6)',
//         borderColor: 'rgba(54, 162, 235, 1)',
//         borderWidth: 1,
//       },
//     ],
//   };

//   // Graphique tickets par statut
//   const statusData = {
//     labels: (stats.par_statut || []).map(s => s.statut || ''),
//     datasets: [
//       {
//         label: 'Tickets par statut',
//         data: (stats.par_statut || []).map(s => s.total || 0),
//         backgroundColor: [
//           'rgba(54, 162, 235, 0.6)',
//           'rgba(255, 206, 86, 0.6)',
//           'rgba(75, 192, 192, 0.6)',
//           'rgba(255, 99, 132, 0.6)',
//           'rgba(153, 102, 255, 0.6)'
//         ],
//         borderColor: [
//           'rgba(54, 162, 235, 1)',
//           'rgba(255, 206, 86, 1)',
//           'rgba(75, 192, 192, 1)',
//           'rgba(255, 99, 132, 1)',
//           'rgba(153, 102, 255, 1)'
//         ],
//         borderWidth: 1,
//       },
//     ],
//   };

//   // Graphique tickets par priorité
//   const priorityData = {
//     labels: (stats.par_priorite || []).map(p => p.priorite || ''),
//     datasets: [
//       {
//         label: 'Tickets par priorité',
//         data: (stats.par_priorite || []).map(p => p.total || 0),
//         backgroundColor: [
//           'rgba(255, 99, 132, 0.6)',
//           'rgba(255, 206, 86, 0.6)',
//           'rgba(75, 192, 192, 0.6)',
//           'rgba(54, 162, 235, 0.6)'
//         ],
//         borderColor: [
//           'rgba(255, 99, 132, 1)',
//           'rgba(255, 206, 86, 1)',
//           'rgba(75, 192, 192, 1)',
//           'rgba(54, 162, 235, 1)'
//         ],
//         borderWidth: 1,
//       },
//     ],
//   };

//   return (
//     <Layout>
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         <div className="flex justify-between items-center mb-6">
//           <h1 className="text-2xl font-bold text-gray-900">Tableau de bord Responsable</h1>
//           <button
//             onClick={fetchStats}
//             className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
//             title="Rafraîchir les statistiques"
//           >
//             <svg 
//               className={`h-5 w-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} 
//               xmlns="http://www.w3.org/2000/svg" 
//               fill="none" 
//               viewBox="0 0 24 24" 
//               stroke="currentColor"
//             >
//               <path 
//                 strokeLinecap="round" 
//                 strokeLinejoin="round" 
//                 strokeWidth={2} 
//                 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
//               />
//             </svg>
//           </button>
//         </div>

//         {/* Statistiques globales */}
//         <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
//           <div className="bg-white p-6 rounded-lg shadow">
//             <h3 className="text-lg font-semibold text-gray-600">Total des tickets</h3>
//             <p className="text-3xl font-bold text-blue-600">{stats.total || 0}</p>
//           </div>
//           <div className="bg-white p-6 rounded-lg shadow">
//             <h3 className="text-lg font-semibold text-gray-600">En cours</h3>
//             <p className="text-3xl font-bold text-blue-500">{stats.en_cours || 0}</p>
//           </div>
//           <div className="bg-white p-6 rounded-lg shadow">
//             <h3 className="text-lg font-semibold text-gray-600">Urgents</h3>
//             <p className="text-3xl font-bold text-red-500">{stats.urgents || 0}</p>
//           </div>
//           <div className="bg-white p-6 rounded-lg shadow">
//             <h3 className="text-lg font-semibold text-gray-600">Clôturés</h3>
//             <p className="text-3xl font-bold text-green-500">{stats.cloture || 0}</p>
//           </div>
//         </div>

//         {/* Graphiques */}
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
//           <div className="bg-white p-6 rounded-lg shadow">
//             <h3 className="text-lg font-semibold mb-4">Tickets par utilisateur</h3>
//             <div className="h-80">
//               <Bar data={userData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
//             </div>
//           </div>
//           <div className="bg-white p-6 rounded-lg shadow">
//             <h3 className="text-lg font-semibold mb-4">Tickets par statut</h3>
//             <div className="h-80">
//               <Pie data={statusData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
//             </div>
//           </div>
//           <div className="bg-white p-6 rounded-lg shadow md:col-span-2">
//             <h3 className="text-lg font-semibold mb-4">Tickets par priorité</h3>
//             <div className="h-80">
//               <Bar data={priorityData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
//             </div>
//           </div>
//         </div>

//         {/* Liste rapide des tickets urgents */}
//         <div className="bg-white p-6 rounded-lg shadow">
//           <h3 className="text-lg font-semibold mb-4 text-red-600">Tickets urgents</h3>
//           {stats.urgents_list && stats.urgents_list.length > 0 ? (
//             <ul className="divide-y divide-gray-200">
//               {stats.urgents_list.map(ticket => (
//                 <li key={ticket.id} className="py-2 flex justify-between items-center">
//                   <span className="font-medium text-gray-800">{ticket.titre}</span>
//                   <span className="text-xs text-gray-500">{ticket.demandeur}</span>
//                   <span className="text-xs text-gray-500">{ticket.statut}</span>
//                 </li>
//               ))}
//             </ul>
//           ) : (
//             <p className="text-gray-500">Aucun ticket urgent.</p>
//           )}
//         </div>
//       </div>
//     </Layout>
//   );
// };

// export default DashboardResponsable; 