import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import Layout from '../components/Layout';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Enregistrement des composants Chart.js nécessaires
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const Dashboard = () => {
  const [stats, setStats] = useState({
    total: 0,
    en_cours: 0,
    en_instance: 0,
    cloture: 0,
    par_priorite: [],
    par_categorie: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('/api/dashboard/stats');
        setStats(response.data || {
          total: 0,
          en_cours: 0,
          en_instance: 0,
          cloture: 0,
          par_priorite: [],
          par_categorie: []
        });
        setError('');
      } catch (err) {
        setError('Erreur lors du chargement des statistiques');
        console.error('Erreur:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-xl">Chargement...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      </Layout>
    );
  }

  // Configuration du graphique en camembert pour les statuts
  const statusData = {
    labels: ['En cours', 'En instance', 'Clôturé'],
    datasets: [
      {
        data: [stats.en_cours || 0, stats.en_instance || 0, stats.cloture || 0],
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
        ],
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
        <h1 className="text-2xl font-bold mb-8">Tableau de bord</h1>

        {/* Cartes de statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-600">Total des tickets</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.total || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-600">En cours</h3>
            <p className="text-3xl font-bold text-blue-500">{stats.en_cours || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-600">En instance</h3>
            <p className="text-3xl font-bold text-yellow-500">{stats.en_instance || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-600">Clôturés</h3>
            <p className="text-3xl font-bold text-green-500">{stats.cloture || 0}</p>
          </div>
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Répartition par statut</h3>
            <div className="h-80">
              <Pie data={statusData} options={options} />
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