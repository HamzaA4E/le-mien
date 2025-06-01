import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from '../utils/axios';
import Layout from '../components/Layout';

const EditTicket = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    Titre: '',
    Description: '',
    Id_Priorite: '',
    Id_Statut: '',
    Id_Demandeur: '',
    Id_Societe: '',
    Id_Emplacement: '',
    Id_Categorie: '',
    DateDebut: '',
    DateFinPrevue: '',
    attachment: null
  });
  const [options, setOptions] = useState({
    priorites: [],
    statuts: [],
    demandeurs: [],
    societes: [],
    emplacements: [],
    categories: []
  });
  const [currentAttachment, setCurrentAttachment] = useState(null);
  const API_BASE_URL = 'http://localhost:8000';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        // Charger d'abord le ticket
        const ticketResponse = await axios.get(`/api/tickets/${id}`);
        const ticket = ticketResponse.data;
        
        console.log('Réponse du backend:', ticket);

        // Fonction pour formater la date
        const formatDate = (dateObj) => {
          if (!dateObj) return '';
          if (typeof dateObj === 'string') return dateObj;
          if (dateObj.date) {
            // Extraire seulement la date (YYYY-MM-DD) du format backend
            return dateObj.date.split(' ')[0];
          }
          return '';
        };

        // Mettre à jour le formulaire avec les données du ticket
        setFormData({
          Titre: ticket.Titre || '',
          Description: ticket.Description || '',
          Id_Priorite: ticket.Id_Priorite || '',
          Id_Statut: ticket.Id_Statut || '',
          Id_Demandeur: ticket.Id_Demandeur || '',
          Id_Societe: ticket.Id_Societe || '',
          Id_Emplacement: ticket.Id_Emplacement || '',
          Id_Categorie: ticket.Id_Categorie || '',
          DateDebut: formatDate(ticket.DateDebut),
          DateFinPrevue: formatDate(ticket.DateFinPrevue),
          attachment: ticket.attachment ? new Blob([ticket.attachment]) : null
        });

        // Charger toutes les options disponibles
        const optionsResponse = await axios.get('/api/tickets/options');
        const { options } = optionsResponse.data;

        // Mettre à jour les options avec toutes les valeurs disponibles
        setOptions({
          priorites: options.priorites || [],
          statuts: options.statuts || [],
          demandeurs: options.demandeurs || [],
          societes: options.societes || [],
          emplacements: options.emplacements || [],
          categories: options.categories || []
        });

        // Afficher le nom de la pièce jointe existante
        if (ticket.attachment_path) {
          const fileName = ticket.attachment_path.split('/').pop();
          setCurrentAttachment({
            name: fileName,
            url: `${API_BASE_URL}/api/tickets/${id}/download`
          });
        } else {
          setCurrentAttachment(null);
        }

      } catch (err) {
        console.error('Erreur:', err);
        setError(err.response?.data?.error || 'Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Validation de la date de fin prévue
    if (name === 'DateFinPrevue' && formData.DateDebut) {
      if (new Date(value) < new Date(formData.DateDebut)) {
        setError('La date de fin prévue ne peut pas être antérieure à la date de début');
        return;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        attachment: file
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      // Formater les dates au format attendu par le backend
      const formatDateForBackend = (dateStr) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        return date.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      };

      // Créer un objet avec les données formatées
      const dataToSend = {
        Titre: formData.Titre,
        Description: formData.Description,
        Id_Priorite: parseInt(formData.Id_Priorite),
        Id_Statut: parseInt(formData.Id_Statut),
        Id_Demandeur: parseInt(formData.Id_Demandeur),
        Id_Societe: parseInt(formData.Id_Societe),
        Id_Emplacement: parseInt(formData.Id_Emplacement),
        Id_Categorie: parseInt(formData.Id_Categorie),
        DateDebut: formatDateForBackend(formData.DateDebut),
        DateFinPrevue: formatDateForBackend(formData.DateFinPrevue)
      };

      // Debug logs
      console.log('Données envoyées au backend:', dataToSend);

      let response;
      
      // Si nous avons une pièce jointe, utiliser FormData
      if (formData.attachment) {
        const formDataToSend = new FormData();
        Object.keys(dataToSend).forEach(key => {
          formDataToSend.append(key, dataToSend[key]);
        });
        formDataToSend.append('attachment', formData.attachment);
        
        response = await axios.put(`/api/tickets/${id}`, formDataToSend);
      } else {
        // Sinon, envoyer les données en JSON
        response = await axios.put(`/api/tickets/${id}`, dataToSend);
      }

      console.log('Réponse du backend:', response.data);
      
      if (response.data && response.data.id) {
        // Rafraîchir la page après la mise à jour
        window.location.href = `/tickets/${id}`;
      } else {
        throw new Error('Erreur lors de la modification du ticket');
      }
    } catch (err) {
      console.error('Erreur complète:', err);
      console.error('Détails de l\'erreur:', {
        status: err.response?.status,
        data: err.response?.data,
        headers: err.response?.headers
      });
      let message = 'Erreur lors de la modification du ticket';
      if (err.response?.data?.message) {
        message = err.response.data.message;
      } else if (err.response?.data?.errors) {
        message = Object.values(err.response.data.errors).flat().join(' ');
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
      alert('Erreur lors de la modification du ticket : ' + message);
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    try {
      if (!currentAttachment) return;
      const fileName = currentAttachment.name;
      const isPdf = fileName.toLowerCase().endsWith('.pdf');
      const response = await axios.get(`${API_BASE_URL}/api/tickets/${id}/download`, {
        responseType: 'blob',
        headers: {
          'Accept': isPdf ? 'application/pdf' : '*/*'
        }
      });
      if (!(response.data instanceof Blob) || response.data.size === 0) {
        throw new Error('Fichier vide ou invalide');
      }
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }, 100);
    } catch (error) {
      alert('Erreur lors du téléchargement de la pièce jointe');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Modifier le ticket</h1>
          <Link
            to={`/tickets/${id}`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Annuler
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="Titre" className="block text-sm font-medium text-gray-700">
                Titre
              </label>
              <input
                type="text"
                name="Titre"
                id="Titre"
                required
                value={formData.Titre}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="Id_Priorite" className="block text-sm font-medium text-gray-700">
                Priorité
              </label>
              <select
                name="Id_Priorite"
                id="Id_Priorite"
                required
                value={formData.Id_Priorite}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Sélectionner une priorité</option>
                {options.priorites.map(priorite => (
                  <option key={priorite.id} value={priorite.id}>
                    {priorite.designation}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="Id_Statut" className="block text-sm font-medium text-gray-700">
                Statut
              </label>
              <select
                name="Id_Statut"
                id="Id_Statut"
                required
                value={formData.Id_Statut}
                onChange={handleChange}
                disabled
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 cursor-not-allowed"
              >
                <option value="">Sélectionner un statut</option>
                {options.statuts.map(statut => (
                  <option key={statut.id} value={statut.id}>
                    {statut.designation}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="Id_Demandeur" className="block text-sm font-medium text-gray-700">
                Demandeur
              </label>
              <select
                name="Id_Demandeur"
                id="Id_Demandeur"
                required
                value={formData.Id_Demandeur}
                onChange={handleChange}
                disabled
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 cursor-not-allowed"
              >
                <option value="">Sélectionner un demandeur</option>
                {options.demandeurs.map(demandeur => (
                  <option key={demandeur.id} value={demandeur.id}>
                    {demandeur.designation}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="Id_Societe" className="block text-sm font-medium text-gray-700">
                Société
              </label>
              <select
                name="Id_Societe"
                id="Id_Societe"
                required
                value={formData.Id_Societe}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Sélectionner une société</option>
                {options.societes.map(societe => (
                  <option key={societe.id} value={societe.id}>
                    {societe.designation}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="Id_Emplacement" className="block text-sm font-medium text-gray-700">
                Emplacement
              </label>
              <select
                name="Id_Emplacement"
                id="Id_Emplacement"
                required
                value={formData.Id_Emplacement}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Sélectionner un emplacement</option>
                {options.emplacements.map(emplacement => (
                  <option key={emplacement.id} value={emplacement.id}>
                    {emplacement.designation}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="Id_Categorie" className="block text-sm font-medium text-gray-700">
                Catégorie
              </label>
              <select
                name="Id_Categorie"
                id="Id_Categorie"
                required
                value={formData.Id_Categorie}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Sélectionner une catégorie</option>
                {options.categories.map(categorie => (
                  <option key={categorie.id} value={categorie.id}>
                    {categorie.designation}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="DateDebut" className="block text-sm font-medium text-gray-700">
                Date de début
              </label>
              <input
                type="date"
                name="DateDebut"
                id="DateDebut"
                required
                value={formData.DateDebut}
                onChange={handleChange}
                disabled
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="DateFinPrevue" className="block text-sm font-medium text-gray-700">
                Date de fin prévue
              </label>
              <input
                type="date"
                name="DateFinPrevue"
                id="DateFinPrevue"
                required
                value={formData.DateFinPrevue}
                onChange={handleChange}
                disabled
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="Description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              name="Description"
              id="Description"
              rows="3"
              required
              value={formData.Description}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="attachment" className="block text-sm font-medium text-gray-700">
              Pièce jointe
            </label>
            {currentAttachment && (
              <div className="mt-2 mb-4">
                <p className="text-sm text-gray-500">Pièce jointe actuelle : {currentAttachment.name}</p>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  Télécharger
                </button>
              </div>
            )}
            <input
              type="file"
              name="attachment"
              id="attachment"
              onChange={handleFileChange}
              className="mt-1 block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
            <p className="mt-1 text-sm text-gray-500">
              Taille maximale : 10MB
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate(`/tickets/${id}`)}
              className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default EditTicket; 