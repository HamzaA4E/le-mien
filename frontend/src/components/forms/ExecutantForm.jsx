import React, { useState } from 'react';
import axios from '../../utils/axios';

const ExecutantForm = ({ onSuccess, onCancel }) => {
  const [designation, setDesignation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/api/executants', { designation });
      if (res.data) {
        onSuccess(res.data);
      }
    } catch (err) {
      setError("Erreur lors de l'ajout de l'exécutant");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label className="block mb-2 font-medium">Nom de l'exécutant</label>
      <input
        type="text"
        value={designation}
        onChange={e => setDesignation(e.target.value)}
        className="w-full border rounded px-3 py-2 mb-3"
        required
        placeholder="Nom de l'exécutant"
      />
      {error && <div className="mb-2 text-red-600">{error}</div>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50"
        >
          Annuler
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? 'Ajout...' : 'Ajouter'}
        </button>
      </div>
    </form>
  );
};

export default ExecutantForm; 