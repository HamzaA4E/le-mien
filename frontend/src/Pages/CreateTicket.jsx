import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import Layout from '../components/Layout';
import AddDemandeurForm from '../components/forms/AddDemandeurForm';
import AddSocieteForm from '../components/forms/AddSocieteForm';
import AddEmplacementForm from '../components/forms/AddEmplacementForm';
import AddPrioriteForm from '../components/forms/AddPrioriteForm';
import AddCategorieForm from '../components/forms/AddCategorieForm';
import AddTypeDemandeForm from '../components/forms/AddTypeDemandeForm';
import AddStatutForm from '../components/forms/AddStatutForm';
import ExecutantForm from '../components/forms/ExecutantForm.jsx';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const CreateTicket = () => {
  const [formData, setFormData] = useState({
    id_demandeur: '',
    id_societe: '',
    id_emplacement: '',
    id_priorite: '',
    id_categorie: '',
    id_type_demande: '',
    id_statut: '',
    id_executant: '',
    titre: '',
    description: '',
    commentaire: '',
    date_debut: '',
    date_fin_prevue: '',
  });

  const [demandeurs, setDemandeurs] = useState([]);
  const [societes, setSocietes] = useState([]);
  const [emplacements, setEmplacements] = useState([]);
  const [priorites, setPriorites] = useState([]);
  const [categories, setCategories] = useState([]);
  const [typesDemande, setTypesDemande] = useState([]);
  const [statuts, setStatuts] = useState([]);
  const [executants, setExecutants] = useState([]);

  const [loadingStates, setLoadingStates] = useState({
    demandeurs: true,
    societes: true,
    emplacements: true,
    priorites: true,
    categories: true,
    typesDemande: true,
    statuts: true,
    executants: true
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showForms, setShowForms] = useState({
    demandeur: false,
    societe: false,
    emplacement: false,
    priorite: false,
    categorie: false,
    type_demande: false,
    statut: false,
    executant: false
  });

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
      await fetchDataWithCache('/api/demandeurs', setDemandeurs, 'demandeurs');
      await fetchDataWithCache('/api/societes', setSocietes, 'societes');
      await fetchDataWithCache('/api/emplacements', setEmplacements, 'emplacements');
      await fetchDataWithCache('/api/priorites', setPriorites, 'priorites');
      await fetchDataWithCache('/api/categories', setCategories, 'categories');
      await fetchDataWithCache('/api/types-demande', setTypesDemande, 'typesDemande');
      await fetchDataWithCache('/api/statuts', setStatuts, 'statuts');
      await fetchDataWithCache('/api/executants', setExecutants, 'executants');
    };

    loadData();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    console.log('[CreateTicket] handleChange', { name, value, type, files });
    
    if (type === 'file') {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
    } else if (value === 'add_new') {
      const formType = name.replace('id_', '');
      console.log('[CreateTicket] Clic sur + Ajouter', formType);
      setShowForms(prev => ({ ...prev, [formType]: true }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value.toString() }));
    }
  };

  const handleFormSuccess = (data, type) => {
    const newItem = { ...data, id: data.id.toString() };
    const setters = {
      demandeur: setDemandeurs,
      societe: setSocietes,
      emplacement: setEmplacements,
      priorite: setPriorites,
      categorie: setCategories,
      type_demande: setTypesDemande,
      statut: setStatuts
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
    try {
      // Create FormData object
      const formDataObj = new FormData();
      
      // Add all form fields to FormData
      Object.keys(formData).forEach(key => {
        if (key === 'attachment' && formData[key]) {
          // If it's a file input, get the actual file
          const fileInput = document.querySelector('input[name="attachment"]');
          if (fileInput && fileInput.files[0]) {
            formDataObj.append('attachment', fileInput.files[0]);
          }
        } else if (formData[key] !== '') {
          // Convert numeric fields
          if (key.startsWith('id_')) {
            formDataObj.append(key, Number(formData[key]));
          } else if (key === 'date_debut' || key === 'date_fin_prevue') {
            // Format dates as YYYY-MM-DD
            const date = formData[key].split(' ')[0];
            formDataObj.append(key, date);
          } else {
            formDataObj.append(key, formData[key]);
          }
        }
      });

      // Add user ID and other required fields
      formDataObj.append('id_utilisateur', 1);
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
          id_societe: '',
          id_emplacement: '',
          id_priorite: '',
          id_categorie: '',
          id_type_demande: '',
          id_statut: '',
          id_executant: '',
          titre: '',
          description: '',
          commentaire: '',
          date_debut: '',
          date_fin_prevue: '',
        });
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
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Demandeur et Société */}
            {renderSelect('id_demandeur', 'Demandeur', demandeurs, loadingStates.demandeurs)}
            {renderSelect('id_societe', 'Société', societes, loadingStates.societes)}

            {/* Emplacement et Priorité */}
            {renderSelect('id_emplacement', 'Emplacement', emplacements, loadingStates.emplacements)}
            {renderSelect('id_priorite', 'Priorité', priorites, loadingStates.priorites)}

            {/* Exécutant */}
            <div className="md:col-span-2">
              <label className="block mb-1">Exécutant</label>
              {loadingStates.executants ? (
                <div className="w-full border rounded px-3 py-2 bg-gray-100 animate-pulse">Chargement...</div>
              ) : (
                <select
                  name="id_executant"
                  value={formData.id_executant}
                  onChange={e => {
                    if (e.target.value === 'add_new') {
                      setShowForms(prev => ({ ...prev, executant: true }));
                    } else {
                      handleChange(e);
                    }
                  }}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Sélectionner l'exécutant</option>
                  {executants
                    .filter((option, idx, arr) => option.id && arr.findIndex(o => o.id === option.id) === idx)
                    .map(option => (
                      <option key={`executant-${option.id}`} value={option.id}>{option.designation}</option>
                    ))}
                  <option key="add_new_executant" value="add_new">+ Ajouter exécutant</option>
                </select>
              )}
            </div>

            {/* Catégorie et Type de demande */}
            {renderSelect('id_categorie', 'Catégorie', categories, loadingStates.categories)}
            {renderSelect('id_type_demande', 'Type de demande', typesDemande, loadingStates.typesDemande)}

            {/* Statut */}
            {renderSelect('id_statut', 'Statut', statuts, loadingStates.statuts)}

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
              <input
                type="file"
                name="attachment"
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
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
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Créer le ticket
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
        {showForms.societe && (
          <AddSocieteForm
            onSuccess={(data) => {
              handleFormSuccess(data, 'societe');
            }}
            onCancel={() => setShowForms(prev => ({ ...prev, societe: false }))}
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
        {showForms.type_demande && (
          <AddTypeDemandeForm
            onSuccess={(data) => {
              handleFormSuccess(data, 'type_demande');
            }}
            onCancel={() => setShowForms(prev => ({ ...prev, type_demande: false }))}
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

        {/* Modal d'ajout exécutant */}
        {showForms.executant && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30">
            <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
              <h2 className="text-lg font-bold mb-4">Ajouter un exécutant</h2>
              <ExecutantForm
                onSuccess={(data) => {
                  setExecutants(prev => [...prev, { ...data, id: data.id.toString() }]);
                  setFormData(prev => ({ ...prev, id_executant: data.id.toString() }));
                  setShowForms(prev => ({ ...prev, executant: false }));
                  invalidateCache('executants');
                }}
                onCancel={() => setShowForms(prev => ({ ...prev, executant: false }))}
              />
            </div>
          </div>
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