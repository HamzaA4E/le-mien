import React, { useEffect, useState } from 'react';
import axios from '../utils/axios';
import { FaSyncAlt } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const EntityManagement = ({ entity, label }) => {
  const [items, setItems] = useState([]);
  const [services, setServices] = useState([]);
  const [designation, setDesignation] = useState('');
  const [idService, setIdService] = useState('');
  const [editId, setEditId] = useState(null);
  const [editDesignation, setEditDesignation] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editIdService, setEditIdService] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [spin, setSpin] = useState(false);

  const getCacheKey = (entity) => `entity_cache_${entity}`;

  const fetchServices = async () => {
    try {
      const res = await axios.get('/api/services?all=1');
      setServices(res.data);
    } catch (err) {
      console.error('Erreur lors du chargement des services:', err);
    }
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);

      // Vérifier le cache dans localStorage
      const cacheKey = getCacheKey(entity);
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          setItems(data);
          setLoading(false);
          return;
        }
      }

      // Si pas de cache valide, faire la requête
      const res = await axios.get(`/api/${entity}?all=1`);
      setItems(res.data);
      
      // Mettre à jour le cache
      localStorage.setItem(cacheKey, JSON.stringify({
        data: res.data,
        timestamp: Date.now()
      }));
    } catch (err) {
      console.error(`Erreur lors du chargement des ${label}s:`, err);
      setError(`Erreur lors du chargement des ${label}s`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    if (entity === 'demandeurs') {
      fetchServices();
    }
  }, [entity]);

  const invalidateCache = () => {
    localStorage.removeItem(getCacheKey(entity));
  };

  // Invalider le cache de la page de création de ticket pour cette entité
  const invalidateCreateTicketCache = () => {
    // Invalider le cache des options
    localStorage.removeItem('create_ticket_options_cache');
  };

  const handleAdd = async () => {
    if (!designation.trim()) {
      toast.error(`Le nom du/de la ${label.toLowerCase()} est requis`);
      return;
    }
    try {
      const data = { 
        designation,
        is_active: true 
      };
      
      if (entity === 'demandeurs' && idService) {
        data.id_service = parseInt(idService);
      }

      await axios.post(`/api/${entity}`, data);
      setDesignation('');
      setIdService('');
      invalidateCache();
      invalidateCreateTicketCache();
      await fetchItems();
      toast.success(`${label} ajouté(e) avec succès`);
    } catch (err) {
      console.error(`Erreur lors de l'ajout:`, err);
      if (err.response?.data?.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error(`Erreur lors de l'ajout du/de la ${label.toLowerCase()}`);
      }
    }
  };

  const handleEdit = (item) => {
    setEditId(item.id);
    setEditDesignation(item.designation);
    setEditIsActive(item.is_active);
    if (entity === 'demandeurs') {
      setEditIdService(item.id_service?.toString() || '');
    }
  };

  const handleUpdate = async () => {
    if (!editDesignation.trim()) {
      toast.error(`Le nom du/de la ${label.toLowerCase()} est requis`);
      return;
    }
    try {
      const data = { 
        designation: editDesignation,
        is_active: editIsActive
      };

      if (entity === 'demandeurs' && editIdService) {
        data.id_service = parseInt(editIdService);
      }

      await axios.put(`/api/${entity}/${editId}`, data);
      setEditId(null);
      setEditDesignation('');
      setEditIsActive(true);
      setEditIdService('');
      invalidateCache();
      invalidateCreateTicketCache();
      await fetchItems();
      toast.success(`${label} modifié(e) avec succès`);
    } catch (err) {
      console.error(`Erreur lors de la mise à jour:`, err);
      if (err.response?.data?.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error(`Erreur lors de la mise à jour du/de la ${label.toLowerCase()}`);
      }
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    setLoadingId(id);
    try {
      const item = items.find(i => i.id === id);
      if (!item) throw new Error('Item not found');

      await axios.put(`/api/${entity}/${id}`, {
        designation: item.designation,
        is_active: !currentStatus
      });

      setItems(prev =>
        prev.map(i =>
          i.id === id ? { ...i, is_active: !currentStatus } : i
        )
      );

      invalidateCache();
      invalidateCreateTicketCache();
      toast.success(`Statut ${!currentStatus ? 'activé' : 'désactivé'} avec succès`);
    } catch (err) {
      console.error('Erreur lors de la mise à jour du statut:', err);
      toast.error('Erreur lors de la mise à jour du statut');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ce/cette ${label.toLowerCase()} ?`)) return;
    try {
      await axios.delete(`/api/${entity}/${id}`);
      invalidateCache();
      invalidateCreateTicketCache();
      await fetchItems();
      toast.success(`${label} supprimé(e) avec succès`);
    } catch (err) {
      console.error(`Erreur lors de la suppression:`, err);
      toast.error(`Erreur lors de la suppression du/de la ${label.toLowerCase()}`);
    }
  };

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded shadow">
        <div className="text-red-600 mb-4">{error}</div>
        <button 
          onClick={fetchItems}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded shadow">
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Gestion des {label}s</h2>
        <button
          onClick={() => {
            setSpin(true);
            fetchItems();
            setTimeout(() => setSpin(false), 600);
          }}
          className="p-2 rounded-full bg-gray-100 hover:bg-blue-100 text-blue-600 transition"
          title="Rafraîchir"
        >
          <FaSyncAlt className={spin ? 'animate-spin-once' : ''} />
        </button>
      </div>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={designation}
          onChange={e => setDesignation(e.target.value)}
          placeholder={`Nouveau/Nouvelle ${label.toLowerCase()}`}
          className="border rounded px-2 py-1 flex-1"
        />
        {entity === 'demandeurs' && (
          <select
            value={idService}
            onChange={e => setIdService(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="">Sélectionner un service</option>
            {services.map(service => (
              <option key={service.id} value={service.id}>
                {service.designation}
              </option>
            ))}
          </select>
        )}
        <button 
          onClick={handleAdd} 
          className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 transition-colors"
        >
          Ajouter
        </button>
      </div>
      <table className="w-full border">
        <thead>
          <tr>
            <th className="border px-2 py-1">Nom</th>
            {entity === 'demandeurs' && (
              <th className="border px-2 py-1">Service</th>
            )}
            <th className="border px-2 py-1">Statut</th>
            <th className="border px-2 py-1">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            // Afficher 3 lignes de squelette
            Array.from({ length: 3 }).map((_, idx) => (
              <tr key={idx}>
                <td className="border px-2 py-1">
                  <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                </td>
                {entity === 'demandeurs' && (
                  <td className="border px-2 py-1">
                    <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                  </td>
                )}
                <td className="border px-2 py-1 text-center">
                  <div className="h-6 w-16 mx-auto bg-gray-200 rounded animate-pulse"></div>
                </td>
                <td className="border px-2 py-1">
                  <div className="h-6 w-24 bg-gray-200 rounded animate-pulse"></div>
                </td>
              </tr>
            ))
          ) : (
            items.map(item => (
              <tr key={item.id}>
                <td className="border px-2 py-1">
                  {editId === item.id ? (
                    <>
                      <input
                        value={editDesignation}
                        onChange={e => setEditDesignation(e.target.value)}
                        className="border rounded px-2 py-1 w-full"
                      />
                      {entity === 'demandeurs' && (
                        <select
                          value={editIdService}
                          onChange={e => setEditIdService(e.target.value)}
                          className="border rounded px-2 py-1 w-full mt-2"
                        >
                          <option value="">Sélectionner un service</option>
                          {services.map(service => (
                            <option key={service.id} value={service.id}>
                              {service.designation}
                            </option>
                          ))}
                        </select>
                      )}
                    </>
                  ) : (
                    item.designation
                  )}
                </td>
                {entity === 'demandeurs' && (
                  <td className="border px-2 py-1">
                    {services.find(s => s.id === item.id_service)?.designation || '-'}
                  </td>
                )}
                <td className="border px-2 py-1 text-center">
                  <span className={
                    item.is_active
                      ? 'inline-block px-2 py-1 text-base font-semibold bg-green-100 text-green-800 rounded-full'
                      : 'inline-block px-2 py-1 text-base font-semibold bg-red-100 text-red-800 rounded-full'
                  }>
                    {item.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="border px-2 py-1">
                  {editId === item.id ? (
                    <>
                      <button 
                        onClick={handleUpdate} 
                        className="bg-green-600 text-white px-2 py-1 rounded mr-2 hover:bg-green-700 transition-colors"
                      >
                        Valider
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        className="bg-gray-400 text-white px-2 py-1 rounded hover:bg-gray-500 transition-colors"
                      >
                        Annuler
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleToggleActive(item.id, item.is_active)}
                        disabled={loadingId === item.id}
                        className={
                          (item.is_active
                            ? 'bg-red-500 hover:bg-red-600'
                            : 'bg-green-500 hover:bg-green-600') +
                          ' text-white px-3 py-1 rounded transition-colors font-semibold mr-2' +
                          (loadingId === item.id ? ' opacity-60 cursor-not-allowed' : '')
                        }
                      >
                        {loadingId === item.id
                          ? 'Changement...'
                          : item.is_active ? 'Désactiver' : 'Activer'}
                      </button>
                      <button
                        onClick={() => handleEdit(item)}
                        className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors font-semibold mr-2"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors font-semibold"
                      >
                        Supprimer
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default EntityManagement; 