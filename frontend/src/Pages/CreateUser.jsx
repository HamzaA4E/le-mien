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
    statut: '1', // 1 par défaut pour actif
    id_service: '' // Ajout du champ id_service
  });

  // Liste des services pour les directeurs département
  const services = [
    { id: 1, designation: 'Achat' },
    { id: 2, designation: 'Administration' },
    { id: 3, designation: 'Finance et Comptabilité' },
    { id: 4, designation: 'Marketing et Communication' },
    { id: 5, designation: 'Fabrication' },
    { id: 6, designation: 'Logistique' },
    { id: 7, designation: 'Commercial' }
  ];

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
      const response = await axios.post('/api/utilisateurs', formData);
      setSuccess('Utilisateur créé avec succès !');
      setFormData({
        designation: '',
        email: '',
        password: '',
        niveau: '',
        statut: '1',
        id_service: ''
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
                <option value="2">Directeur Général</option>
                <option value="3">Directeur Département</option>
                <option value="4">Demandeur</option>
                <option value="5">Exécutant</option>
              </select>
            </div>

            {(formData.niveau === '3' || formData.niveau === '4') && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Service</label>
                <select
                  name="id_service"
                  value={formData.id_service}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">Sélectionner un service</option>
                  {services.map(service => (
                    <option key={service.id} value={service.id}>
                      {service.designation}
                    </option>
                  ))}
                </select>
              </div>
            )}

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