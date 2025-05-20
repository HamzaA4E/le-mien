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

const Dashboard = () => {
  const [stats, setStats] = useState({
    total: 0,
    en_cours: 0,
    en_instance: 0,
    cloture: 0,
    par_priorite: [],
    par_categorie: [],
    par_demandeur: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [spin, setSpin] = useState(false);

  useEffect(() => {
    const fetchSequentialStats = async () => {
      setSpin(true);
      setLoading(true);
      try {
        // Charger d'abord le total
        const totalRes = await axios.get('/api/dashboard/total');
        setStats(s => ({ ...s, total: totalRes.data.total }));
        // Puis en cours
        const enCoursRes = await axios.get('/api/dashboard/en-cours');
        setStats(s => ({ ...s, en_cours: enCoursRes.data.total }));
        // Puis en instance
        const enInstanceRes = await axios.get('/api/dashboard/en-instance');
        setStats(s => ({ ...s, en_instance: enInstanceRes.data.total }));
        // Puis clôturés
        const clotureRes = await axios.get('/api/dashboard/cloture');
        setStats(s => ({ ...s, cloture: clotureRes.data.total }));
        // Puis les stats détaillées (graphes)
        const statsRes = await axios.get('/api/dashboard/stats');
        setStats(s => ({
          ...s,
          par_priorite: statsRes.data.par_priorite || [],
          par_categorie: statsRes.data.par_categorie || [],
          par_demandeur: statsRes.data.par_demandeur || []
        }));
        setError('');
      } catch (err) {
        setError('Erreur lors du chargement des statistiques');
      } finally {
        setLoading(false);
        setTimeout(() => setSpin(false), 600);
      }
    };
    fetchSequentialStats();
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
              onClick={() => window.location.reload()}
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

  // Configuration du graphique en barres pour les demandeurs
  const demandeurData = {
    labels: (stats.par_demandeur || []).map(item => item.demandeur || ''),
    datasets: [
      {
        label: 'Nombre de tickets',
        data: (stats.par_demandeur || []).map(item => item.total || 0),
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Configuration du graphique en barres pour les priorités
  const priorityData = {
    labels: (stats.par_priorite || []).map(item => item.priorite || ''),
    datasets: [
      {
        label: 'Nombre de tickets',
        data: (stats.par_priorite || []).map(item => item.total || 0),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Configuration du graphique en barres pour les catégories
  const categoryData = {
    labels: (stats.par_categorie || []).map(item => item.categorie || ''),
    datasets: [
      {
        label: 'Nombre de tickets',
        data: (stats.par_categorie || []).map(item => item.total || 0),
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
            onClick={() => window.location.reload()}
            className="ml-2 p-2 rounded-full bg-gray-100 hover:bg-blue-100 text-blue-600 transition"
            title="Rafraîchir"
          >
            <FaSyncAlt className={spin ? 'animate-spin-once' : ''} />
          </button>
        </div>

        {/* Cartes de statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Link to="/tickets" className="bg-white p-6 rounded-lg shadow flex flex-col items-start hover:bg-gray-50 transition-colors cursor-pointer">
            <h3 className="text-sm font-medium text-gray-500">Total tickets</h3>
            <p className="mt-2 text-3xl font-extrabold text-blue-600">{stats.total}</p>
          </Link>
          <Link to="/tickets?statut=2" className="bg-white p-6 rounded-lg shadow flex flex-col items-start hover:bg-gray-50 transition-colors cursor-pointer">
            <h3 className="text-sm font-medium text-gray-500">En cours</h3>
            <p className="mt-2 text-3xl font-extrabold text-yellow-500">{stats.en_cours}</p>
          </Link>
          <Link to="/tickets?statut=1" className="bg-white p-6 rounded-lg shadow flex flex-col items-start hover:bg-gray-50 transition-colors cursor-pointer">
            <h3 className="text-sm font-medium text-gray-500">En instance</h3>
            <p className="mt-2 text-3xl font-extrabold text-orange-500">{stats.en_instance}</p>
          </Link>
          <Link to="/tickets?statut=3" className="bg-white p-6 rounded-lg shadow flex flex-col items-start hover:bg-gray-50 transition-colors cursor-pointer">
            <h3 className="text-sm font-medium text-gray-500">Clôturés</h3>
            <p className="mt-2 text-3xl font-extrabold text-green-600">{stats.cloture}</p>
          </Link>
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Répartition par demandeur</h3>
            <div className="h-80">
              <Bar data={demandeurData} options={options} />
            </div>
          </div>
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