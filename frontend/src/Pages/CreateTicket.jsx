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

// Cache pour stocker les données fréquemment utilisées
const dataCache = {
  priorites: null,
  categories: null,
  typesDemande: null,
  statuts: null
};

const CreateTicket = () => {
  const [formData, setFormData] = useState({
    id_demandeur: '',
    id_societe: '',
    id_emplacement: '',
    id_priorite: '',
    id_categorie: '',
    id_type_demande: '',
    id_statut: '',
    titre: '',
    description: '',
    commentaire: ''
  });

  const [demandeurs, setDemandeurs] = useState([]);
  const [societes, setSocietes] = useState([]);
  const [emplacements, setEmplacements] = useState([]);
  const [priorites, setPriorites] = useState([]);
  const [categories, setCategories] = useState([]);
  const [typesDemande, setTypesDemande] = useState([]);
  const [statuts, setStatuts] = useState([]);

  // États de chargement individuels
  const [loadingStates, setLoadingStates] = useState({
    demandeurs: true,
    societes: true,
    emplacements: true,
    priorites: true,
    categories: true,
    typesDemande: true,
    statuts: true
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showDemandeurForm, setShowDemandeurForm] = useState(false);
  const [showSocieteForm, setShowSocieteForm] = useState(false);
  const [showEmplacementForm, setShowEmplacementForm] = useState(false);
  const [showPrioriteForm, setShowPrioriteForm] = useState(false);
  const [showCategorieForm, setShowCategorieForm] = useState(false);
  const [showTypeDemandeForm, setShowTypeDemandeForm] = useState(false);
  const [showStatutForm, setShowStatutForm] = useState(false);

  // Fonction pour charger les données avec mise en cache
  const fetchDataWithCache = async (endpoint, setter, cacheKey) => {
    try {
      // Si les données sont en cache, les utiliser
      if (dataCache[cacheKey]) {
        setter(dataCache[cacheKey]);
        setLoadingStates(prev => ({ ...prev, [cacheKey]: false }));
        return;
      }

      const response = await axios.get(endpoint);
      const data = response.data.map(d => ({ ...d, id: d.id.toString() }));
      
      // Mettre en cache les données fréquemment utilisées
      if (['priorites', 'categories', 'typesDemande', 'statuts'].includes(cacheKey)) {
        dataCache[cacheKey] = data;
      }
      
      setter(data);
      setLoadingStates(prev => ({ ...prev, [cacheKey]: false }));
    } catch (err) {
      console.error(`Erreur lors du chargement des ${cacheKey}:`, err);
      setError(`Erreur lors du chargement des ${cacheKey}`);
      setLoadingStates(prev => ({ ...prev, [cacheKey]: false }));
    }
  };

  useEffect(() => {
    // Charger d'abord les données fréquemment utilisées
    const loadFrequentData = async () => {
      await Promise.all([
        fetchDataWithCache('/api/priorites', setPriorites, 'priorites'),
        fetchDataWithCache('/api/categories', setCategories, 'categories'),
        fetchDataWithCache('/api/types-demande', setTypesDemande, 'typesDemande'),
        fetchDataWithCache('/api/statuts', setStatuts, 'statuts')
      ]);
    };

    // Charger ensuite les données moins fréquentes
    const loadLessFrequentData = async () => {
      await Promise.all([
        fetchDataWithCache('/api/demandeurs', setDemandeurs, 'demandeurs'),
        fetchDataWithCache('/api/societes', setSocietes, 'societes'),
        fetchDataWithCache('/api/emplacements', setEmplacements, 'emplacements')
      ]);
    };

    loadFrequentData().then(loadLessFrequentData);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (value === 'add_new') {
      switch (name) {
        case 'id_demandeur': setShowDemandeurForm(true); break;
        case 'id_societe': setShowSocieteForm(true); break;
        case 'id_emplacement': setShowEmplacementForm(true); break;
        case 'id_priorite': setShowPrioriteForm(true); break;
        case 'id_categorie': setShowCategorieForm(true); break;
        case 'id_type_demande': setShowTypeDemandeForm(true); break;
        case 'id_statut': setShowStatutForm(true); break;
        default: break;
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFormSuccess = (data, type) => {
    const newItem = { ...data, id: data.id.toString() };
    switch (type) {
      case 'demandeur':
        setDemandeurs(prev => [...prev, newItem]);
        setFormData(prev => ({ ...prev, id_demandeur: newItem.id }));
        break;
      case 'societe':
        setSocietes(prev => [...prev, newItem]);
        setFormData(prev => ({ ...prev, id_societe: newItem.id }));
        break;
      case 'emplacement':
        setEmplacements(prev => [...prev, newItem]);
        setFormData(prev => ({ ...prev, id_emplacement: newItem.id }));
        break;
      case 'priorite':
        setPriorites(prev => [...prev, newItem]);
        setFormData(prev => ({ ...prev, id_priorite: newItem.id }));
        break;
      case 'categorie':
        setCategories(prev => [...prev, newItem]);
        setFormData(prev => ({ ...prev, id_categorie: newItem.id }));
        break;
      case 'type_demande':
        setTypesDemande(prev => [...prev, newItem]);
        setFormData(prev => ({ ...prev, id_type_demande: newItem.id }));
        break;
      case 'statut':
        setStatuts(prev => [...prev, newItem]);
        setFormData(prev => ({ ...prev, id_statut: newItem.id }));
        break;
      default: break;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const payload = {
        ...formData,
        id_priorite: Number(formData.id_priorite),
        id_statut: Number(formData.id_statut),
        id_demandeur: Number(formData.id_demandeur),
        id_societe: Number(formData.id_societe),
        id_emplacement: Number(formData.id_emplacement),
        id_categorie: Number(formData.id_categorie),
        id_type_demande: Number(formData.id_type_demande),
        id_utilisateur: 1, // À remplacer par l'ID de l'utilisateur connecté
        date_debut: new Date().toISOString().slice(0, 19).replace('T', ' '),
        date_fin_prevue: new Date().toISOString().slice(0, 19).replace('T', ' '),
        date_fin_reelle: null
      };

      console.log('Payload envoyé:', JSON.stringify(payload, null, 2));

      const response = await axios.post('/api/tickets', payload);
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
          titre: '',
          description: '',
          commentaire: ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Erreur complète:', err);
      console.error('Détails de l\'erreur:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });

      let errorMessage = 'Erreur lors de la création du ticket';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.errors) {
        errorMessage = Object.entries(err.response.data.errors)
          .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
          .join('\n');
      }

      setError(errorMessage);
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
          {options.map(option => (
            <option key={option.id} value={option.id}>
              {option.designation}
            </option>
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
              </div>
            </div>

            {/* Demandeur et Société */}
            {renderSelect('id_demandeur', 'Demandeur', demandeurs, loadingStates.demandeurs)}
            {renderSelect('id_societe', 'Société', societes, loadingStates.societes)}

            {/* Emplacement et Priorité */}
            {renderSelect('id_emplacement', 'Emplacement', emplacements, loadingStates.emplacements)}
            {renderSelect('id_priorite', 'Priorité', priorites, loadingStates.priorites)}

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
        {showDemandeurForm && (
          <AddDemandeurForm
            onSuccess={(data) => {
              handleFormSuccess(data, 'demandeur');
              setShowDemandeurForm(false);
            }}
            onCancel={() => setShowDemandeurForm(false)}
          />
        )}
        {showSocieteForm && (
          <AddSocieteForm
            onSuccess={(data) => {
              handleFormSuccess(data, 'societe');
              setShowSocieteForm(false);
            }}
            onCancel={() => setShowSocieteForm(false)}
          />
        )}
        {showEmplacementForm && (
          <AddEmplacementForm
            onSuccess={(data) => {
              handleFormSuccess(data, 'emplacement');
              setShowEmplacementForm(false);
            }}
            onCancel={() => setShowEmplacementForm(false)}
          />
        )}
        {showPrioriteForm && (
          <AddPrioriteForm
            onSuccess={(data) => {
              handleFormSuccess(data, 'priorite');
              setShowPrioriteForm(false);
            }}
            onCancel={() => setShowPrioriteForm(false)}
          />
        )}
        {showCategorieForm && (
          <AddCategorieForm
            onSuccess={(data) => {
              handleFormSuccess(data, 'categorie');
              setShowCategorieForm(false);
            }}
            onCancel={() => setShowCategorieForm(false)}
          />
        )}
        {showTypeDemandeForm && (
          <AddTypeDemandeForm
            onSuccess={(data) => {
              handleFormSuccess(data, 'type_demande');
              setShowTypeDemandeForm(false);
            }}
            onCancel={() => setShowTypeDemandeForm(false)}
          />
        )}
        {showStatutForm && (
          <AddStatutForm
            onSuccess={(data) => {
              handleFormSuccess(data, 'statut');
              setShowStatutForm(false);
            }}
            onCancel={() => setShowStatutForm(false)}
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