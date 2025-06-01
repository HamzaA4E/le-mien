import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import Layout from '../components/Layout';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { FaSyncAlt, FaFilter } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Enregistrement des composants Chart.js nécessaires
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, ChartDataLabels);

// Cache pour les statistiques du dashboard
const dashboardCache = {
  stats: null,
  lastFetch: null,
  lastParams: null,
  // Durée de validité du cache (5 minutes)
  cacheDuration: 5 * 60 * 1000
};

const statutColors = {
  'tickets': 'border-blue-400 text-blue-600 bg-white',
  'En instance': 'border-red-400 text-red-600 bg-white',
  'En cours': 'border-yellow-400 text-yellow-600 bg-white',
  'Clôturé': 'border-green-400 text-green-600 bg-white',
  // Ajoute d'autres statuts ici si besoin
};

const statutHoverBg = {
  'En instance': 'hover:bg-red-50',
  'En cours': 'hover:bg-yellow-50',
  'Clôturé': 'hover:bg-green-50',
  // Ajoute d'autres statuts ici si besoin
};

const Dashboard = () => {
  const [stats, setStats] = useState({
    total: 0,
    ticketsByStatut: [],
    ticketsByPriorite: [],
    ticketsByCategorie: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [spin, setSpin] = useState(false);
  const [selectedPriorites, setSelectedPriorites] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);

  const fetchStats = async () => {
    setSpin(true);
    setLoading(true);
    try {
      const response = await axios.get('/api/dashboard/stats');
      setStats(response.data);
      setError('');
    } catch (err) {
      setError('Erreur lors du chargement des statistiques');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
      setTimeout(() => setSpin(false), 600);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Générer des couleurs pour les pie charts
  const pieColors = [
    '#2563eb', '#f59e42', '#10b981', '#f43f5e', '#6366f1', '#fbbf24', '#0ea5e9', '#a3e635', '#f472b6', '#818cf8', '#fca5a5', '#fcd34d', '#6ee7b7', '#c084fc', '#f9a8d4', '#fef08a', '#a3e635', '#fca5a5', '#f472b6', '#64748b'
  ];

  // Configuration du graphique en donut pour les priorités
  const priorityData = {
    labels: stats.ticketsByPriorite.map(item => item.designation),
    datasets: [
      {
        data: stats.ticketsByPriorite.map(item => item.count),
        backgroundColor: pieColors,
        borderWidth: 1,
        hoverOffset: 45,
      },
    ],
  };

  // Configuration du graphique en donut pour les catégories
  const categoryData = {
    labels: stats.ticketsByCategorie.map(item => item.designation),
    datasets: [
      {
        data: stats.ticketsByCategorie.map(item => item.count),
        backgroundColor: pieColors,
        borderWidth: 1,
        hoverOffset: 45,
      },
    ],
  };

  // Options pour les donut charts
  const getPieOptions = (title, selectedItems, setSelectedItems) => ({
    responsive: true,
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
        backgroundColor: (context) => pieColors[context.dataIndex % pieColors.length],
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
          return [...prev, { label, value, color: pieColors[index % pieColors.length] }];
        });
      }
    },
  });

  const renderSkeleton = () => (
    <div className="animate-pulse">
      {/* Skeleton pour les cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>

      {/* Skeleton pour les graphiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className={`bg-white p-6 rounded-lg shadow ${i === 2 ? 'md:col-span-2' : ''}`}>
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-80 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold">Tableau de bord</h1>
            <button
              onClick={fetchStats}
              className="ml-2 p-2 rounded-full bg-gray-100 hover:bg-blue-100 text-blue-600 transition"
              title="Rafraîchir"
            >
              <FaSyncAlt className={spin ? 'animate-spin-once' : ''} />
            </button>
          </div>
          {renderSkeleton()}
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
            onClick={fetchStats}
            className="ml-2 p-2 rounded-full bg-gray-100 hover:bg-blue-100 text-blue-600 transition"
            title="Rafraîchir"
          >
            <FaSyncAlt className={spin ? 'animate-spin-once' : ''} />
          </button>
        </div>

        {/* Cartes de statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Link to="/tickets" className={`border-l-4 p-6 rounded-lg shadow flex flex-col items-start hover:bg-gray-50 transition-colors cursor-pointer ${statutColors['tickets']}`}> 
            <h3 className="text-lg font-bold text-black">Total tickets</h3>
            <p className="mt-2 text-3xl font-extrabold text-blue-600">{stats.total}</p>
          </Link>
          {stats.ticketsByStatut.map((statutObj) => {
            const borderClass = statutColors[statutObj.designation] || 'border-purple-500 bg-white';
            const hoverClass = statutHoverBg[statutObj.designation] || 'hover:bg-purple-50';
            const textColor = (borderClass.match(/text-[^ ]+/) || ['text-purple-700'])[0];
            return (
              <Link
                key={statutObj.designation}
                to={`/tickets?statut=${statutObj.designation}`}
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
              <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 10c-4.41 0-8-1.79-8-4V6c0-2.21 3.59-4 8-4s8 1.79 8 4v8c0 2.21-3.59 4-8 4z" /></svg>
              Répartition par priorité
            </h3>
            <div className="flex justify-center items-center">
              <div className="w-[30rem] h-[30rem] rounded-full bg-white">
                <Pie data={priorityData} options={getPieOptions('Répartition par priorité', selectedPriorites, setSelectedPriorites)} />
              </div>
            </div>
            {selectedPriorites.length > 0 && (
              <div className="mt-2 mx-auto max-w-md p-2 bg-white rounded-xl border border-blue-100 shadow flex flex-col gap-1">
                <h4 className="text-xs font-semibold text-blue-700 mb-1 text-center flex items-center gap-1 justify-center">
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 10c-4.41 0-8-1.79-8-4V6c0-2.21 3.59-4 8-4s8 1.79 8 4v8c0 2.21-3.59 4-8 4z" /></svg>
                  Détails des priorités
                </h4>
                <div className="space-y-0.5">
                  {[...new Map(selectedPriorites.map(item => [item.label, item])).values()].map((item, index) => (
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

          <div className="bg-white p-6 rounded-2xl shadow-xl md:col-span-2">
            <h3 className="text-xl font-bold mb-4 text-green-900 flex items-center gap-2">
              <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 10c-4.41 0-8-1.79-8-4V6c0-2.21 3.59-4 8-4s8 1.79 8 4v8c0 2.21-3.59 4-8 4z" /></svg>
              Répartition par catégorie
            </h3>
            <div className="flex justify-center items-center">
              <div className="w-[30rem] h-[30rem] rounded-full bg-white">
                <Pie data={categoryData} options={getPieOptions('Répartition par catégorie', selectedCategories, setSelectedCategories)} />
              </div>
            </div>
            {selectedCategories.length > 0 && (
              <div className="mt-2 mx-auto max-w-md p-2 bg-white rounded-xl border border-green-100 shadow flex flex-col gap-1">
                <h4 className="text-xs font-semibold text-green-700 mb-1 text-center flex items-center gap-1 justify-center">
                  <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 10c-4.41 0-8-1.79-8-4V6c0-2.21 3.59-4 8-4s8 1.79 8 4v8c0 2.21-3.59 4-8 4z" /></svg>
                  Détails des catégories
                </h4>
                <div className="space-y-0.5">
                  {[...new Map(selectedCategories.map(item => [item.label, item])).values()].map((item, index) => (
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
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard; 