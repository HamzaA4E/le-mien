import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import axios from '../utils/axios';
import Layout from '../components/Layout';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { FaSyncAlt, FaFilter } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Enregistrement des composants Chart.js nécessaires
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, ChartDataLabels);

// Lazy loading des composants de graphiques
const Pie = lazy(() => import('react-chartjs-2').then(module => ({ default: module.Pie })));
const Bar = lazy(() => import('react-chartjs-2').then(module => ({ default: module.Bar })));

// Constantes et configurations
const PIE_COLORS = [
  '#2563eb', '#f59e42', '#10b981', '#f43f5e', '#6366f1', '#fbbf24', '#0ea5e9', '#a3e635', '#f472b6', '#818cf8'
];

const STATUT_COLORS = {
  'tickets': 'border-blue-400 text-blue-600 bg-white',
  'En instance': 'border-red-400 text-red-600 bg-white',
  'En cours': 'border-yellow-400 text-yellow-600 bg-white',
  'Clôturé': 'border-green-400 text-green-600 bg-white',
};

const STATUT_HOVER_BG = {
  'En instance': 'hover:bg-red-50',
  'En cours': 'hover:bg-yellow-50',
  'Clôturé': 'hover:bg-green-50',
};

// Cache pour les statistiques du dashboard
const dashboardCache = {
  stats: null,
  lastFetch: null,
  lastParams: null,
  cacheDuration: 5 * 60 * 1000
};

// Composant de chargement pour les graphiques
const ChartLoading = () => (
  <div className="animate-pulse">
    <div className="h-80 bg-gray-200 rounded-lg"></div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    total: 0,
    ticketsByStatut: [],
    ticketsByPriorite: [],
    ticketsByCategorie: [],
    ticketsByDemandeur: [],
    ticketsByEmplacement: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [spin, setSpin] = useState(false);
  const [selectedPriorites, setSelectedPriorites] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedDemandeurs, setSelectedDemandeurs] = useState([]);
  const [selectedEmplacements, setSelectedEmplacements] = useState([]);
  const [chartsLoaded, setChartsLoaded] = useState(false);

  // Récupérer le user courant
  let currentUser = null;
  try {
    currentUser = JSON.parse(localStorage.getItem('user'));
    console.log('Current user:', currentUser); // Debug log
  } catch (e) {
    console.error('Error parsing user:', e); // Debug log
    currentUser = null;
  }

  const canViewDemandeurStats = currentUser?.niveau === 1 || currentUser?.niveau === 2 || currentUser?.niveau === 3;
  console.log('Can view demandeur stats:', canViewDemandeurStats); // Debug log

  // Mémorisation des données des graphiques
  const priorityData = useMemo(() => ({
    labels: stats.ticketsByPriorite.map(item => item.designation),
    datasets: [{
      data: stats.ticketsByPriorite.map(item => item.count),
      backgroundColor: PIE_COLORS,
      borderWidth: 1,
      hoverOffset: 45,
    }],
  }), [stats.ticketsByPriorite]);

  const demandeurData = useMemo(() => {
    console.log('Stats ticketsByDemandeur:', stats.ticketsByDemandeur); // Debug log
    let filteredDemandeurs = stats.ticketsByDemandeur || [];
    
    // Si l'utilisateur est un directeur de département, filtrer par son service
    if (currentUser?.niveau === 3 && currentUser?.service?.id) {
      filteredDemandeurs = filteredDemandeurs.filter(item => 
        item.service_id === currentUser.service.id
      );
    }

    console.log('Filtered demandeurs:', filteredDemandeurs); // Debug log
    return {
      labels: filteredDemandeurs.map(item => item.designation),
      datasets: [{
        data: filteredDemandeurs.map(item => item.count),
        backgroundColor: PIE_COLORS,
        borderWidth: 1,
        hoverOffset: 45,
      }],
    };
  }, [stats.ticketsByDemandeur, currentUser]);

  const categoryData = useMemo(() => ({
    labels: stats.ticketsByCategorie.map(item => item.designation),
    datasets: [{
      data: stats.ticketsByCategorie.map(item => item.count),
      backgroundColor: PIE_COLORS,
      borderWidth: 1,
      hoverOffset: 45,
    }],
  }), [stats.ticketsByCategorie]);

  const emplacementData = useMemo(() => ({
    labels: (stats.ticketsByEmplacement || []).map(item => item.designation),
    datasets: [{
      data: (stats.ticketsByEmplacement || []).map(item => item.count),
      backgroundColor: PIE_COLORS,
      borderWidth: 1,
      hoverOffset: 45,
    }],
  }), [stats.ticketsByEmplacement]);

  // Options mémorisées pour les graphiques
  const getPieOptions = useMemo(() => (title, selectedItems, setSelectedItems) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: title,
        font: { size: 18, weight: 'bold' },
        color: '#1e293b',
        padding: { top: 10, bottom: 20 },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const value = context.raw;
            const percent = total ? ((value / total) * 100).toFixed(1) : 0;
            return `${context.label}: ${value} tickets (${percent}%)`;
          }
        }
      },
      datalabels: {
        color: '#fff',
        font: { weight: 'bold', size: 13 },
        formatter: (value, context) => {
          const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
          if (!total || value === 0) return '';
          const percent = (value / total) * 100;
          return percent >= 5 ? `${percent.toFixed(0)}%` : '';
        },
        borderRadius: 4,
        backgroundColor: (context) => PIE_COLORS[context.dataIndex % PIE_COLORS.length],
        padding: 4,
        display: true,
      },
    },
    onHover: (event, chartElement) => {
      event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
    },
    onClick: (event, elements, chart) => {
      if (elements && elements.length > 0) {
        const index = elements[0].index;
        const label = chart.data.labels[index];
        const value = chart.data.datasets[0].data[index];
        setSelectedItems(prev => {
          if (prev.some(item => item.label === label)) return prev;
          return [...prev, { label, value, color: PIE_COLORS[index % PIE_COLORS.length] }];
        });
      }
    },
  }), []);

  const fetchStats = async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && 
        dashboardCache.stats && 
        dashboardCache.lastFetch && 
        (now - dashboardCache.lastFetch < dashboardCache.cacheDuration)) {
      setStats(dashboardCache.stats);
      setLoading(false);
      return;
    }

    setSpin(true);
    setLoading(true);
    try {
      const response = await axios.get('/api/dashboard/stats', {
        params: { refresh: forceRefresh },
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data && !response.data.error) {
        console.log('API Response:', response.data); // Debug log
        // Transformer les données par_demandeur en ticketsByDemandeur
        const transformedData = {
          ...response.data,
          ticketsByDemandeur: response.data.par_demandeur?.map(item => ({
            designation: item.demandeur,
            count: item.total,
            service_id: item.service_id // Assurez-vous que cette donnée est présente dans la réponse API
          })) || [],
          ticketsByEmplacement: response.data.par_emplacement?.map(item => ({
            designation: item.emplacement,
            count: item.total
          })) || []
        };
        console.log('Transformed data:', transformedData); // Debug log
        setStats(transformedData);
        dashboardCache.stats = transformedData;
        dashboardCache.lastFetch = now;
        setError('');
      } else {
        throw new Error(response.data.error || 'Erreur inconnue');
      }
    } catch (err) {
      console.error('Erreur lors du chargement des statistiques:', err);
      setError(err.response?.data?.error || 'Erreur lors du chargement des statistiques');
      if (dashboardCache.stats) {
        setStats(dashboardCache.stats);
      }
    } finally {
      setLoading(false);
      setTimeout(() => setSpin(false), 600);
    }
  };

  useEffect(() => {
    fetchStats(true);
    const timer = setTimeout(() => setChartsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold">Tableau de bord</h1>
            <button
              onClick={() => fetchStats(true)}
              className="ml-2 p-2 rounded-full bg-gray-100 hover:bg-blue-100 text-blue-600 transition"
              title="Rafraîchir"
            >
              <FaSyncAlt className={spin ? 'animate-spin-once' : ''} />
            </button>
          </div>
          <div className="animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className={`bg-white p-6 rounded-lg shadow ${i === 2 ? 'md:col-span-2' : ''}`}>
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="h-80 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="p-4 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Tableau de bord</h1>
          <button
            onClick={() => fetchStats(true)}
            className="ml-2 p-2 rounded-full bg-gray-100 hover:bg-blue-100 text-blue-600 transition"
            title="Rafraîchir"
          >
            <FaSyncAlt className={spin ? 'animate-spin-once' : ''} />
          </button>
        </div>

        {/* Cartes de statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Link to="/tickets" className={`border-l-4 p-6 rounded-lg shadow flex flex-col items-start hover:bg-gray-50 transition-colors cursor-pointer ${STATUT_COLORS['tickets']}`}> 
            <h3 className="text-lg font-bold text-black">Total tickets</h3>
            <p className="mt-2 text-3xl font-extrabold text-blue-600">{stats.total}</p>
          </Link>
          {stats.ticketsByStatut.map((statutObj) => {
            const borderClass = STATUT_COLORS[statutObj.designation] || 'border-purple-500 bg-white';
            const hoverClass = STATUT_HOVER_BG[statutObj.designation] || 'hover:bg-purple-50';
            const textColor = (borderClass.match(/text-[^ ]+/) || ['text-purple-700'])[0];
            return (
              <Link
                key={statutObj.designation}
                to={`/tickets?statut=${statutObj.id}`}
                className={`border-l-4 p-6 rounded-lg shadow flex flex-col items-start transition-colors cursor-pointer ${borderClass} ${hoverClass}`}
                style={{ minWidth: 220 }}
              >
                <h3 className="text-lg font-bold text-black mb-2">{statutObj.designation}</h3>
                <p className={`mt-2 text-4xl font-extrabold ${textColor}`}>{statutObj.count}</p>
              </Link>
            );
          })}
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-2xl shadow-xl">
            <h3 className="text-xl font-bold mb-4 text-blue-900 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 10c-4.41 0-8-1.79-8-4V6c0-2.21 3.59-4 8-4s8 1.79 8 4v8c0 2.21-3.59 4-8 4z" />
              </svg>
              Répartition par priorité
            </h3>
            <div className="flex justify-center items-center h-[20rem]">
              <Suspense fallback={<ChartLoading />}>
                {chartsLoaded && (
                  <div className="w-full h-full">
                    <Pie data={priorityData} options={getPieOptions('Répartition par priorité', selectedPriorites, setSelectedPriorites)} />
                  </div>
                )}
              </Suspense>
            </div>
            {selectedPriorites.length > 0 && (
              <div className="mt-2 mx-auto max-w-md p-2 bg-white rounded-xl border border-blue-100 shadow flex flex-col gap-1">
                <h4 className="text-xs font-semibold text-blue-700 mb-1 text-center flex items-center gap-1 justify-center">
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 10c-4.41 0-8-1.79-8-4V6c0-2.21 3.59-4 8-4s8 1.79 8 4v8c0 2.21-3.59 4-8 4z" />
                  </svg>
                  Détails des priorités
                </h4>
                <div className="space-y-0.5">
                  {[...new Map(selectedPriorites.map(item => [item.label, item])).values()].map((item) => (
                    <div key={item.label} className="flex items-center justify-between px-3 py-1 bg-blue-50 rounded border border-blue-100">
                      <span className="text-blue-900 font-medium text-sm truncate flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                        {item.label}
                      </span>
                      <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                        {item.value} tickets
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-xl">
            <h3 className="text-xl font-bold mb-4 text-green-900 flex items-center gap-2">
              <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 10c-4.41 0-8-1.79-8-4V6c0-2.21 3.59-4 8-4s8 1.79 8 4v8c0 2.21-3.59 4-8 4z" />
              </svg>
              Répartition par catégorie
            </h3>
            <div className="flex justify-center items-center h-[20rem]">
              <Suspense fallback={<ChartLoading />}>
                {chartsLoaded && (
                  <div className="w-full h-full">
                    <Pie data={categoryData} options={getPieOptions('Répartition par catégorie', selectedCategories, setSelectedCategories)} />
                  </div>
                )}
              </Suspense>
            </div>
            {selectedCategories.length > 0 && (
              <div className="mt-2 mx-auto max-w-md p-2 bg-white rounded-xl border border-green-100 shadow flex flex-col gap-1">
                <h4 className="text-xs font-semibold text-green-700 mb-1 text-center flex items-center gap-1 justify-center">
                  <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 10c-4.41 0-8-1.79-8-4V6c0-2.21 3.59-4 8-4s8 1.79 8 4v8c0 2.21-3.59 4-8 4z" />
                  </svg>
                  Détails des catégories
                </h4>
                <div className="space-y-0.5">
                  {[...new Map(selectedCategories.map(item => [item.label, item])).values()].map((item) => (
                    <div key={item.label} className="flex items-center justify-between px-3 py-1 bg-green-50 rounded border border-green-100">
                      <span className="text-green-900 font-medium text-sm truncate flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                        {item.label}
                      </span>
                      <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                        {item.value} tickets
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {canViewDemandeurStats && (
            <div className="bg-white p-6 rounded-2xl shadow-xl">
              <h3 className="text-xl font-bold mb-4 text-purple-900 flex items-center gap-2">
                <svg className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {currentUser?.niveau === '3' ? 'Répartition par demandeur de mon département' : 'Répartition par demandeur'}
              </h3>
              <div className="flex justify-center items-center h-[20rem]">
                <Suspense fallback={<ChartLoading />}>
                  {chartsLoaded && (
                    <div className="w-full h-full">
                      <Pie data={demandeurData} options={getPieOptions(
                        currentUser?.niveau === '3' ? 'Répartition par demandeur de mon département' : 'Répartition par demandeur',
                        selectedDemandeurs,
                        setSelectedDemandeurs
                      )} />
                    </div>
                  )}
                </Suspense>
              </div>
              {selectedDemandeurs.length > 0 && (
                <div className="mt-2 mx-auto max-w-md p-2 bg-white rounded-xl border border-purple-100 shadow flex flex-col gap-1">
                  <h4 className="text-xs font-semibold text-purple-700 mb-1 text-center flex items-center gap-1 justify-center">
                    <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {currentUser?.niveau === '3' ? 'Détails des demandeurs de mon département' : 'Détails des demandeurs'}
                  </h4>
                  <div className="space-y-0.5">
                    {[...new Map(selectedDemandeurs.map(item => [item.label, item])).values()].map((item) => (
                      <div key={item.label} className="flex items-center justify-between px-3 py-1 bg-purple-50 rounded border border-purple-100">
                        <span className="text-purple-900 font-medium text-sm truncate flex items-center gap-2">
                          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                          {item.label}
                        </span>
                        <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                          {item.value} tickets
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-white p-6 rounded-2xl shadow-xl">
            <h3 className="text-xl font-bold mb-4 text-orange-900 flex items-center gap-2">
              <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Répartition par emplacement
            </h3>
            <div className="flex justify-center items-center h-[20rem]">
              <Suspense fallback={<ChartLoading />}>
                {chartsLoaded && (
                  <div className="w-full h-full">
                    <Pie data={emplacementData} options={getPieOptions('Répartition par emplacement', selectedEmplacements, setSelectedEmplacements)} />
                  </div>
                )}
              </Suspense>
            </div>
            {selectedEmplacements.length > 0 && (
              <div className="mt-2 mx-auto max-w-md p-2 bg-white rounded-xl border border-orange-100 shadow flex flex-col gap-1">
                <h4 className="text-xs font-semibold text-orange-700 mb-1 text-center flex items-center gap-1 justify-center">
                  <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Détails des emplacements
                </h4>
                <div className="space-y-0.5">
                  {[...new Map(selectedEmplacements.map(item => [item.label, item])).values()].map((item) => (
                    <div key={item.label} className="flex items-center justify-between px-3 py-1 bg-orange-50 rounded border border-orange-100">
                      <span className="text-orange-900 font-medium text-sm truncate flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                        {item.label}
                      </span>
                      <span className="text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                        {item.value} tickets
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard; 