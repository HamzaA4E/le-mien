import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import Layout from '../components/Layout';
import { useCounters } from '../contexts/CountersContext';
import { FaPlus, FaTrash } from 'react-icons/fa';

const CreateTicket = () => {
  const { refreshCounters } = useCounters();
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    
    try {
      const formDataObj = new FormData();
      
      // Ajouter les champs obligatoires
      formDataObj.append('titre', formData.titre);
      formDataObj.append('description', formData.description);
      
      // Ajouter les fichiers
      attachments.forEach((file, idx) => {
        formDataObj.append('attachments[]', file);
      });

      // Ajouter l'ID de l'utilisateur connecté
      const currentUser = JSON.parse(localStorage.getItem('user'));
      formDataObj.append('id_utilisateur', currentUser.id);
      formDataObj.append('id_demandeur', currentUser.id);

      const response = await axios.post('/api/tickets', formDataObj);

      if (response.data) {
        setSuccess('Ticket créé avec succès ! Il sera examiné par l\'administrateur.');
        setFormData({
          titre: '',
          description: '',
        });
        setAttachments([]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        refreshCounters();
      }
    } catch (err) {
      console.error('Erreur lors de la création du ticket:', err);
      setError(err.response?.data?.message || 'Erreur lors de la création du ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded shadow">
        <h1 className="text-2xl font-bold mb-6">Créer un ticket</h1>
        
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">{success}</div>}
        
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">Information</h2>
          <p className="text-blue-700 text-sm">
            Votre ticket sera examiné par l'administrateur qui définira la catégorie, l'emplacement, 
            le type de demande et les autres détails techniques avant de l'approuver. 
            Une fois approuvé, il sera soumis au directeur de service pour validation si nécessaire.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Titre */}
            <div>
              <label className="block mb-2 font-medium text-gray-700">
                Titre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="titre"
                value={formData.titre}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Titre du ticket"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block mb-2 font-medium text-gray-700">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="5"
                placeholder="Décrivez votre demande en détail..."
              />
            </div>

            {/* Pièces jointes */}
            <div>
              <label className="block mb-2 font-medium text-gray-700">
                Pièces jointes (optionnel)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded p-4">
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Formats acceptés : PDF, DOC, DOCX, JPG, JPEG, PNG, GIF (max 10MB par fichier)
                </p>
              </div>
              
              {/* Liste des fichiers sélectionnés */}
              {attachments.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Fichiers sélectionnés :</h4>
                  <div className="space-y-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-600">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <FaTrash size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Boutons */}
          <div className="mt-8 flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="px-4 py-2 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Annuler
            </button>
            <button
              type="submit"
              className={`px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center ${
                isSubmitting ? 'opacity-60 cursor-not-allowed' : ''
              }`}
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
              )}
              {isSubmitting ? 'Création en cours...' : 'Créer le ticket'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default CreateTicket; 