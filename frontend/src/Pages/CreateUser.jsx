import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from '../utils/axios';

const CreateUser = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    designation: '',
    email: '',
    password: '',
    niveau: '',
    statut: '1' // 1 par défaut pour actif
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Vérifier si l'utilisateur est connecté
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Initialiser le token CSRF au chargement du composant
    const initCsrf = async () => {
      try {
        await axios.get('/sanctum/csrf-cookie');
        // Attendre un court instant pour s'assurer que le cookie est bien défini
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Erreur lors de l\'initialisation du token CSRF:', error);
      }
    };

    initCsrf();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // S'assurer que le token CSRF est à jour
      await axios.get('/sanctum/csrf-cookie');
      // Attendre un court instant pour s'assurer que le cookie est bien défini
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response = await axios.post('/api/utilisateurs', formData);
      
      setSuccess('Utilisateur créé avec succès !');
      setFormData({
        designation: '',
        email: '',
        password: '',
        niveau: '',
        statut: '1'
      });
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      setError(error.response?.data?.message || 'Erreur lors de la création de l\'utilisateur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">Créer un nouvel utilisateur</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Désignation</label>
              <input
                type="text"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Nom complet de l'utilisateur"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="exemple@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Mot de passe</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Niveau</label>
              <select
                name="niveau"
                value={formData.niveau}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">Sélectionner un niveau</option>
                <option value="1">Administrateur</option>
                <option value="2">Responsable</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Statut</label>
              <select
                name="statut"
                value={formData.statut}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="1">Actif</option>
                <option value="0">Inactif</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Création en cours...' : 'Créer l\'utilisateur'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default CreateUser; 