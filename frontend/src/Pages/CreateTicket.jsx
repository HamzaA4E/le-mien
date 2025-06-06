import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import Layout from '../components/Layout';
import AddDemandeurForm from '../components/forms/AddDemandeurForm';

import AddEmplacementForm from '../components/forms/AddEmplacementForm';
import AddPrioriteForm from '../components/forms/AddPrioriteForm';
import AddCategorieForm from '../components/forms/AddCategorieForm';
import AddStatutForm from '../components/forms/AddStatutForm';
import AddExecutantForm from '../components/forms/AddExecutantForm';
import { FaPlus, FaTrash } from 'react-icons/fa';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const CreateTicket = () => {
  const [formData, setFormData] = useState({
    id_demandeur: '',
    id_emplacement: '',
    id_priorite: '',
    id_categorie: '',
    id_statut: '',
    id_executant: '',
    titre: '',
    description: '',
    commentaire: '',
    date_debut: '',
    date_fin_prevue: '',
  });

  const [demandeurs, setDemandeurs] = useState([]);
  
  const [emplacements, setEmplacements] = useState([]);
  const [priorites, setPriorites] = useState([]);
  const [categories, setCategories] = useState([]);
  const [statuts, setStatuts] = useState([]);
  const [executants, setExecutants] = useState([]);

  const [loadingStates, setLoadingStates] = useState({
    demandeurs: true,
    
    emplacements: true,
    priorites: true,
    categories: true,
    statuts: true,
    executants: true,
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showForms, setShowForms] = useState({
    demandeur: false,
    
    emplacement: false,
    priorite: false,
    categorie: false,
    statut: false,
    executant: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [attachments, setAttachments] = useState([]);

  const getCacheKey = (entity) => `create_ticket_${entity}_cache`;

  const fetchDataWithCache = async (endpoint, setter, entity) => {
    try {
      setLoadingStates(prev => ({ ...prev, [entity]: true }));

      // Vérifier le cache dans localStorage
      const cached = localStorage.getItem(getCacheKey(entity));
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          // Filtrer les entités actives
          const activeData = data.filter(item => item.is_active !== false);
          setter(activeData);
          setLoadingStates(prev => ({ ...prev, [entity]: false }));
          return;
        }
      }

      // Si pas de cache valide, faire la requête
      const response = await axios.get(endpoint);
      const data = response.data.map(d => ({
        ...d,
        id: d.id ? d.id.toString() : ''
      }));
      
      // Filtrer les entités actives avant de mettre en cache
      const activeData = data.filter(item => item.is_active !== false);
      
      // Mettre à jour le cache avec uniquement les entités actives
      localStorage.setItem(getCacheKey(entity), JSON.stringify({
        data: activeData,
        timestamp: Date.now()
      }));
      
      setter(activeData);
    } catch (err) {
      console.error(`Erreur lors du chargement des ${entity}:`, err);
      setError(`Erreur lors du chargement des ${entity}`);
    } finally {
      setLoadingStates(prev => ({ ...prev, [entity]: false }));
    }
  };

  const invalidateCache = (entity) => {
    localStorage.removeItem(getCacheKey(entity));
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingStates(prev => ({
          demandeurs: true,
         
          emplacements: true,
          priorites: true,
          categories: true,
          statuts: true,
          executants: true,
        }));

        // Vérifier le cache dans localStorage
        const cached = localStorage.getItem('create_ticket_options_cache');
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setDemandeurs(data.demandeurs || []);
            
            setEmplacements(data.emplacements || []);
            setPriorites(data.priorites || []);
            setCategories(data.categories || []);
            setStatuts(data.statuts || []);
            setExecutants(data.executants || []);
            setLoadingStates(prev => ({
              demandeurs: false,
              
              emplacements: false,
              priorites: false,
              categories: false,
              statuts: false,
              executants: false,
            }));
            return;
          }
        }

        // Si pas de cache valide, faire la requête
        const response = await axios.get('/api/tickets/options');
        const { options } = response.data;

        // Mettre à jour le cache
        localStorage.setItem('create_ticket_options_cache', JSON.stringify({
          data: options,
          timestamp: Date.now()
        }));

        // Mettre à jour les états
        setDemandeurs(options.demandeurs || []);
      
        setEmplacements(options.emplacements || []);
        setPriorites(options.priorites || []);
        setCategories(options.categories || []);
        setStatuts(options.statuts || []);
        setExecutants(options.executants || []);

      } catch (err) {
        console.error('Erreur lors du chargement des options:', err);
        setError('Erreur lors du chargement des options');
      } finally {
        setLoadingStates(prev => ({
          demandeurs: false,
         
          emplacements: false,
          priorites: false,
          categories: false,
          statuts: false,
          executants: false,
        }));
      }
    };

    loadData();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    console.log('[CreateTicket] handleChange', { name, value, type, files });
    
    // Validation de la date de fin prévue
    if (name === 'date_fin_prevue' && formData.date_debut) {
      if (new Date(value) < new Date(formData.date_debut)) {
        setError('La date de fin prévue ne peut pas être antérieure à la date de début');
        return;
      }
    }
    
    if (type === 'file') {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
    } else if (value === 'add_new') {
      const formType = name.replace('id_', '');
      console.log('[CreateTicket] Clic sur + Ajouter', formType);
      setShowForms(prev => ({ ...prev, [formType]: true }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value.toString() }));
    }
    setError('');
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleFormSuccess = (data, type) => {
    const newItem = { ...data, id: data.id.toString() };
    const setters = {
      demandeur: setDemandeurs,
     
      emplacement: setEmplacements,
      priorite: setPriorites,
      categorie: setCategories,
      statut: setStatuts,
      executant: setExecutants
    };

    console.log(`[CreateTicket] Ajout d'une entité`, { type, data: newItem });
    setters[type](prev => {
      const updated = [...prev, newItem];
      console.log(`[CreateTicket] Nouvelle liste pour ${type}:`, updated);
      return updated;
    });
    setFormData(prev => ({ ...prev, [`id_${type}`]: newItem.id.toString() }));
    setShowForms(prev => ({ ...prev, [type]: false }));
    invalidateCache(type);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    try {
      const formDataObj = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'attachment') return; // On gère attachments séparément
        if (formData[key] !== '') {
          if (key.startsWith('id_')) {
            formDataObj.append(key, Number(formData[key]));
          } else if (key === 'date_debut' || key === 'date_fin_prevue' || key === 'date_fin_reelle') {
            const date = formData[key].split(' ')[0];
            formDataObj.append(key, date);
          } else {
            formDataObj.append(key, formData[key]);
          }
        }
      });
      // Ajouter les fichiers
      attachments.forEach((file, idx) => {
        formDataObj.append('attachments[]', file);
      });

      // Add user ID and other required fields
      const currentUser = JSON.parse(localStorage.getItem('user'));
      formDataObj.append('id_utilisateur', currentUser.id);
      formDataObj.append('id_demandeur', currentUser.id);
      formDataObj.append('date_fin_reelle', ''); // Add empty string for date_fin_reelle

      // Log the FormData contents for debugging
      console.log('FormData contents:');
      for (let pair of formDataObj.entries()) {
        console.log(pair[0] + ': ' + (pair[1] instanceof File ? pair[1].name : pair[1]));
      }

      const response = await axios.post('/api/tickets', formDataObj);

      console.log('Réponse du serveur:', response.data);

      if (response.data) {
        setSuccess('Ticket créé avec succès !');
        setFormData({
          id_demandeur: '',
          
          id_emplacement: '',
          id_priorite: '',
          id_categorie: '',
          id_statut: '',
          id_executant: '',
          titre: '',
          description: '',
          commentaire: '',
          date_debut: '',
          date_fin_prevue: '',
        });
        setAttachments([]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Erreur complète:', err);
      console.error('Détails de l\'erreur:', {
        message: err.message,
        response: err.response,
        status: err.response?.status,
        data: err.response?.data,
        errors: err.response?.data?.errors
      });
      
      // Display validation errors if they exist
      if (err.response?.data?.errors) {
        const errorMessages = Object.entries(err.response.data.errors)
          .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
          .join('\n');
        setError(`Erreurs de validation:\n${errorMessages}`);
      } else {
        setError(err.response?.data?.message || 'Une erreur est survenue lors de la création du ticket');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Modifier la partie du rendu pour afficher les états de chargement
  const renderSelect = (name, label, options, loading) => (
    <div>
      <label className="block mb-1">{label}</label>
      {loading ? (
        <div className="w-full border rounded px-3 py-2 bg-gray-100 animate-pulse">
          Chargement...
        </div>
      ) : (
        <select
          name={name}
          value={formData[name]}
          onChange={handleChange}
          required
          className="w-full border rounded px-3 py-2"
        >
          <option value="">Sélectionner {label.toLowerCase()}</option>
          {options
            .filter(option => typeof option.id === 'string' || typeof option.id === 'number')
            .filter((option, idx, arr) => arr.findIndex(o => o.id === option.id) === idx)
            .map(option => (
              <option key={`option-${option.id}`} value={option.id}>{option.designation}</option>
            ))}
          <option value="add_new">+ Ajouter {label.toLowerCase()}</option>
        </select>
      )}
    </div>
  );

  return (
    <Layout>
      <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded shadow">
        <h1 className="text-2xl font-bold mb-6">Créer un ticket</h1>
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">{success}</div>}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Informations principales */}
            <div className="md:col-span-2">
              <h2 className="text-lg font-semibold mb-3">Informations principales</h2>
              <div className="space-y-4">
                <div>
                  <label className="block mb-1">Titre</label>
                  <input
                    type="text"
                    name="titre"
                    value={formData.titre}
                    onChange={handleChange}
                    required
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block mb-1">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    required
                    className="w-full border rounded px-3 py-2"
                    rows="3"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1">Date de début</label>
                    <input
                      type="date"
                      name="date_debut"
                      value={formData.date_debut}
                      onChange={handleChange}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block mb-1">Date de fin prévue</label>
                    <input
                      type="date"
                      name="date_fin_prevue"
                      value={formData.date_fin_prevue}
                      onChange={handleChange}
                      min={formData.date_debut || undefined}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Demandeur et Société */}
            {renderSelect('id_demandeur', 'Demandeur', demandeurs, loadingStates.demandeurs)}
           

            {/* Emplacement et Priorité */}
            {renderSelect('id_emplacement', 'Emplacement', emplacements, loadingStates.emplacements)}
            {renderSelect('id_priorite', 'Priorité', priorites, loadingStates.priorites)}

            {/* Catégorie */}
            {renderSelect('id_categorie', 'Catégorie', categories, loadingStates.categories)}

            {/* Statut */}
            {renderSelect('id_statut', 'Statut', statuts, loadingStates.statuts)}

            {/* Exécutant */}
            {renderSelect('id_executant', 'Exécutant', executants, loadingStates.executants)}

            {/* Commentaire */}
            <div className="md:col-span-2">
              <label className="block mb-1">Commentaire</label>
              <textarea
                name="commentaire"
                value={formData.commentaire}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
                rows="3"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block mb-1">Pièce jointe</label>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    name="attachments"
                    multiple
                    onChange={handleFileChange}
                    className="w-full border rounded px-3 py-2"
                  />
                  <button
                    type="button"
                    onClick={() => document.querySelector('input[name=attachments]').click()}
                    className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    title="Ajouter une pièce jointe"
                  >
                    <FaPlus />
                  </button>
                </div>
                {attachments.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {attachments.map((file, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm bg-gray-100 rounded px-2 py-1">
                        <span className="truncate flex-1">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(idx)}
                          className="text-red-600 hover:text-red-800"
                          title="Supprimer"
                        >
                          <FaTrash />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center ${isSubmitting ? 'opacity-60 cursor-not-allowed' : ''}`}
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

        {/* Modaux d'ajout */}
        {showForms.demandeur && (
          <AddDemandeurForm
            onSuccess={(data) => {
              handleFormSuccess(data, 'demandeur');
            }}
            onCancel={() => setShowForms(prev => ({ ...prev, demandeur: false }))}
          />
        )}
        
        {showForms.emplacement && (
          <AddEmplacementForm
            onSuccess={(data) => {
              handleFormSuccess(data, 'emplacement');
            }}
            onCancel={() => setShowForms(prev => ({ ...prev, emplacement: false }))}
          />
        )}
        {showForms.priorite && (
          <AddPrioriteForm
            onSuccess={(data) => {
              handleFormSuccess(data, 'priorite');
            }}
            onCancel={() => setShowForms(prev => ({ ...prev, priorite: false }))}
          />
        )}
        {showForms.categorie && (
          <AddCategorieForm
            onSuccess={(data) => {
              handleFormSuccess(data, 'categorie');
            }}
            onCancel={() => setShowForms(prev => ({ ...prev, categorie: false }))}
          />
        )}
        {showForms.statut && (
          <AddStatutForm
            onSuccess={(data) => {
              handleFormSuccess(data, 'statut');
            }}
            onCancel={() => setShowForms(prev => ({ ...prev, statut: false }))}
          />
        )}
        {showForms.executant && (
          <AddExecutantForm
            onSuccess={(data) => {
              handleFormSuccess(data, 'executant');
            }}
            onCancel={() => setShowForms(prev => ({ ...prev, executant: false }))}
          />
        )}

        {/* Debug section */}
        <div className="mt-8 p-4 bg-gray-100 rounded">
          <h3 className="font-bold mb-2">Debug formData :</h3>
          <pre className="whitespace-pre-wrap">{JSON.stringify(formData, null, 2)}</pre>
          {error && (
            <div className="mt-4">
              <h3 className="font-bold text-red-600">Erreur :</h3>
              <pre className="whitespace-pre-wrap text-red-600">{error}</pre>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CreateTicket; 