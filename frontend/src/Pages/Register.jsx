import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../utils/axios';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    level: '',
    service: ''
  });
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showServiceSelect, setShowServiceSelect] = useState(false);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await axios.get('/api/public/services');
        if (response.data && Array.isArray(response.data)) {
          setServices(response.data);
        } else {
          console.error('Format de données invalide:', response.data);
          setError('Format de données invalide reçu du serveur');
        }
      } catch (err) {
        console.error('Erreur détaillée:', err);
        setError('Erreur lors du chargement des services. Veuillez réessayer plus tard.');
      }
    };

    fetchServices();
  }, []);

  const handleLevelChange = (e) => {
    const level = e.target.value;
    setFormData({ ...formData, level, service: '' }); // Reset service when level changes
    setShowServiceSelect(level === 'employe' || level === 'directeur_departement');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.post('/api/public/register-request', formData);
      setSuccess('Votre demande d\'inscription a été envoyée avec succès. Vous recevrez un email une fois votre compte approuvé.');
      setFormData({
        fullName: '',
        email: '',
        level: '',
        service: ''
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Une erreur est survenue lors de l\'envoi de la demande. Veuillez réessayer plus tard.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-indigo-500 to-purple-600 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Demande d'inscription
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Remplissez ce formulaire pour demander un compte. Un administrateur examinera votre demande.
          </p>
        </div>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
            {success}
          </div>
        )}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="fullName" className="sr-only">Nom complet</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Nom complet"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="email" className="sr-only">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="level" className="sr-only">Niveau</label>
              <select
                id="level"
                name="level"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                value={formData.level}
                onChange={handleLevelChange}
              >
                <option value="">Sélectionnez votre niveau</option>
                <option value="employe">Employé</option>
                <option value="directeur_departement">Directeur de département</option>
                <option value="directeur_general">Directeur général</option>
              </select>
            </div>
            {showServiceSelect && (
              <div>
                <label htmlFor="service" className="sr-only">Service</label>
                <select
                  id="service"
                  name="service"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  value={formData.service}
                  onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                >
                  <option value="">Sélectionnez votre service</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Envoi en cours...' : 'Envoyer la demande'}
            </button>
          </div>
        </form>
        <div className="text-center mt-4">
          <button
            onClick={() => navigate('/login')}
            className="text-indigo-600 hover:text-indigo-500"
          >
            Déjà un compte ? Connectez-vous
          </button>
        </div>
      </div>
    </div>
  );
};

export default Register;