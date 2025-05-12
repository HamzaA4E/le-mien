import React, { useState, useEffect } from 'react';
import axios from '../../utils/axios';

const AddDemandeurForm = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    designation: '',
    id_service: '',
    statut: '1'
  });

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);
  const [error, setError] = useState('');
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [newService, setNewService] = useState({ designation: '' });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoadingServices(true);
      const response = await axios.get('/api/services');
      setServices(response.data);
      setError('');
    } catch (error) {
      console.error('Erreur lors du chargement des services:', error);
      setError('Erreur lors du chargement des services');
    } finally {
      setLoadingServices(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleServiceChange = (e) => {
    const { name, value } = e.target;
    setNewService(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await axios.post('/api/services', newService);
      const newServiceData = response.data;
      setServices(prev => [...prev, newServiceData]);
      setFormData(prev => ({ ...prev, id_service: String(newServiceData.id) }));
      setShowServiceForm(false);
      setNewService({ designation: '' });
    } catch (error) {
      setError('Erreur lors de la création du service');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const submitData = {
        ...formData,
        id_service: formData.id_service ? Number(formData.id_service) : null,
        statut: Number(formData.statut)
      };

      const response = await axios.post('/api/demandeurs', submitData);
      onSuccess(response.data);
    } catch (error) {
      setError(error.response?.data?.message || 'Erreur lors de la création du demandeur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Ajouter un demandeur</h3>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Désignation</label>
              <input
                type="text"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                required
                maxLength={50}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Service</label>
              <div className="flex space-x-2">
                {loadingServices ? (
                  <div className="mt-1 w-full py-2 text-center text-sm text-gray-500">
                    Chargement des services...
                  </div>
                ) : (
                  <>
                    <select
                      name="id_service"
                      value={formData.id_service}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="">Sélectionner un service</option>
                      {services.map(service => (
                        <option key={service.id} value={String(service.id)}>
                          {service.designation}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowServiceForm(true)}
                      className="mt-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      +
                    </button>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Statut</label>
              <select
                name="statut"
                value={formData.statut}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="1">Actif</option>
                <option value="0">Inactif</option>
              </select>
            </div>

            <div className="flex justify-end space-x-4 mt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading || loadingServices}
                className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                  (loading || loadingServices) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Création en cours...' : 'Créer'}
              </button>
            </div>
          </form>

          {showServiceForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-semibold mb-4">Ajouter un Service</h2>
                
                <form onSubmit={handleAddService}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Désignation *
                    </label>
                    <input
                      type="text"
                      name="designation"
                      value={newService.designation}
                      onChange={handleServiceChange}
                      required
                      maxLength={50}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Entrez la désignation du service"
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowServiceForm(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {loading ? 'Ajout en cours...' : 'Ajouter'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddDemandeurForm; 