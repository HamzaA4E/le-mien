import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import Layout from '../components/Layout';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { FaSyncAlt, FaFilter } from 'react-icons/fa';
import { Link } from 'react-router-dom';

// Enregistrement des composants Chart.js nécessaires
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

// Cache pour les statistiques du dashboard
const dashboardCache = {
  stats: null,
  lastFetch: null,
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

  // Configuration du graphique en barres pour les priorités
  const priorityData = {
    labels: stats.ticketsByPriorite.map(item => item.designation),
    datasets: [
      {
        label: 'Nombre de tickets',
        data: stats.ticketsByPriorite.map(item => item.count),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Configuration du graphique en barres pour les catégories
  const categoryData = {
    labels: stats.ticketsByCategorie.map(item => item.designation),
    datasets: [
      {
        label: 'Nombre de tickets',
        data: stats.ticketsByCategorie.map(item => item.count),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Répartition des tickets',
      },
    },
  };

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
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Répartition par priorité</h3>
            <div className="h-80">
              <Bar data={priorityData} options={options} />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow md:col-span-2">
            <h3 className="text-lg font-semibold mb-4">Répartition par catégorie</h3>
            <div className="h-80">
              <Bar data={categoryData} options={options} />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard; 