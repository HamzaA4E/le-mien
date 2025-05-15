import React, { useEffect, useState } from 'react';
import axios from '../utils/axios';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const EntityManagement = ({ entity, label }) => {
  const [items, setItems] = useState([]);
  const [designation, setDesignation] = useState('');
  const [editId, setEditId] = useState(null);
  const [editDesignation, setEditDesignation] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getCacheKey = (entity) => `entity_cache_${entity}`;

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
      const res = await axios.get(`/api/${entity}`);
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
  }, [entity]);

  const invalidateCache = () => {
    localStorage.removeItem(getCacheKey(entity));
  };

  const handleAdd = async () => {
    if (!designation.trim()) return;
    try {
      await axios.post(`/api/${entity}`, { designation });
      setDesignation('');
      invalidateCache();
      await fetchItems();
    } catch (err) {
      console.error(`Erreur lors de l'ajout:`, err);
      alert(`Erreur lors de l'ajout du/de la ${label.toLowerCase()}`);
    }
  };

  const handleEdit = (item) => {
    setEditId(item.id);
    setEditDesignation(item.designation);
  };

  const handleUpdate = async () => {
    if (!editDesignation.trim()) return;
    try {
      await axios.put(`/api/${entity}/${editId}`, { designation: editDesignation });
      setEditId(null);
      setEditDesignation('');
      invalidateCache();
      await fetchItems();
    } catch (err) {
      console.error(`Erreur lors de la mise à jour:`, err);
      alert(`Erreur lors de la mise à jour du/de la ${label.toLowerCase()}`);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm(`Supprimer ce/cette ${label.toLowerCase()} ?`)) {
      try {
        await axios.delete(`/api/${entity}/${id}`);
        invalidateCache();
        await fetchItems();
      } catch (err) {
        console.error(`Erreur lors de la suppression:`, err);
        alert(`Erreur lors de la suppression du/de la ${label.toLowerCase()}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded shadow">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-8 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

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
      <h2 className="text-xl font-bold mb-4">Gestion des {label}s</h2>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={designation}
          onChange={e => setDesignation(e.target.value)}
          placeholder={`Nouveau/Nouvelle ${label.toLowerCase()}`}
          className="border rounded px-2 py-1 flex-1"
        />
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
            <th className="border px-2 py-1">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id}>
              <td className="border px-2 py-1">
                {editId === item.id ? (
                  <input
                    value={editDesignation}
                    onChange={e => setEditDesignation(e.target.value)}
                    className="border rounded px-2 py-1 w-full"
                  />
                ) : (
                  item.designation
                )}
              </td>
              <td className="border px-2 py-1">
                {editId === item.id ? (
                  <button 
                    onClick={handleUpdate} 
                    className="bg-green-600 text-white px-2 py-1 rounded mr-2 hover:bg-green-700 transition-colors"
                  >
                    Valider
                  </button>
                ) : (
                  <button 
                    onClick={() => handleEdit(item)} 
                    className="bg-yellow-500 text-white px-2 py-1 rounded mr-2 hover:bg-yellow-600 transition-colors"
                  >
                    Modifier
                  </button>
                )}
                <button 
                  onClick={() => handleDelete(item.id)} 
                  className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition-colors"
                >
                  Supprimer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EntityManagement; 