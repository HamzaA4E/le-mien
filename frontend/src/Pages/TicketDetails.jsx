import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from '../utils/axios';
import Layout from '../components/Layout';
import TicketReport from '../components/TicketReport';
import md5 from 'md5';

const TicketDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportRaison, setReportRaison] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportSuccess, setReportSuccess] = useState('');
  const [reportAttachment, setReportAttachment] = useState(null);
  const [user, setUser] = useState(null);
  const [filteredReports, setFilteredReports] = useState([]);
  const [comment, setComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [commentSuccess, setCommentSuccess] = useState('');
  const [showAllComments, setShowAllComments] = useState(true);
  const commentSectionRef = useRef(null);
  const reportsSectionRef = useRef(null);
  const [hasUnviewedReports, setHasUnviewedReports] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingCommentIndex, setEditingCommentIndex] = useState(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get('/api/user');
        setUser(response.data);
        console.log('User data fetched:', response.data);
        console.log('User ID:', response.data?.id, typeof response.data?.id);
      } catch (err) {
        console.error('Erreur lors de la récupération des informations utilisateur:', err);
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/tickets/${id}`);
        setTicket(response.data);
        console.log('Ticket complet reçu:', response.data);
        console.log('Reports du ticket:', response.data.reports);
        console.log('Reports de type rejet:', response.data.reports?.filter(report => report.type === 'rejet'));
        setError('');
      } catch (err) {
        setError('Erreur lors du chargement du ticket');
        console.error('Erreur:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [id]);

  useEffect(() => {
    if (ticket?.reports) {
      // Display all reports for now, as both creator and responsable need to see them.
      // Further filtering logic can be added here if needed in the future.
      setFilteredReports(ticket.reports);
      // Vérifier s'il y a des rapports non vus
      const hasUnviewed = ticket.reports.some(report => !report.is_viewed);
      setHasUnviewedReports(hasUnviewed);
    } else if (ticket && !ticket?.reports) {
       // If ticket data is loaded but no reports, set to empty array
       setFilteredReports([]);
       setHasUnviewedReports(false);
    } else {
        // If ticket is null or still loading, set to empty array
        setFilteredReports([]);
        setHasUnviewedReports(false);
    }
  }, [ticket, user]);

  const parseFrDate = (frDate) => {
    if (!frDate || typeof frDate !== 'string') return null;
    const [date, time] = frDate.split(' ');
    if (!date || !time) return null;
    const [day, month, year] = date.split('/');
    if (!day || !month || !year) return null;
    return `${year}-${month}-${day}T${time}`;
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return '-';
    // Si c'est un objet Laravel (date, timezone_type, timezone)
    let dateString = dateValue;
    if (typeof dateValue === 'object' && dateValue.date) {
      dateString = dateValue.date;
    }
    // On coupe à la seconde si besoin (ex: 2025-05-14 16:34:24.000000)
    if (typeof dateString === 'string' && dateString.includes('.')) {
      dateString = dateString.split('.')[0];
    }
    // Format ISO pour JS
    const isoString = dateString.replace(' ', 'T');
    const date = new Date(isoString);
    return isNaN(date) ? '-' : date.toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    setReportLoading(true);
    setReportError('');
    setReportSuccess('');

    const formData = new FormData();
    formData.append('raison', reportRaison);
    if (reportAttachment) {
      formData.append('attachment', reportAttachment);
    }

    try {
      const response = await axios.post(`/api/tickets/${ticket.id}/reports`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setReportSuccess('Report envoyé avec succès !');
      setReportRaison('');
      setReportAttachment(null);
      setShowReportModal(false);
      // Rafraîchir la liste des reports immédiatement
      const reportsResponse = await axios.get(`/api/tickets/${ticket.id}/reports`);
      setFilteredReports(reportsResponse.data);
    } catch (err) {
      console.error('Erreur complète:', err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Erreur lors de l\'envoi du report';
      setReportError(errorMessage);
    } finally {
      setReportLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
        setError('');
        // Correction : parser le JSON et nettoyer le nom du fichier
        let fileName = '';
        try {
          const paths = JSON.parse(ticket.attachment_path);
          if (Array.isArray(paths) && paths.length > 0) {
            fileName = paths[0].split('/').pop();
          }
        } catch {
          fileName = ticket.attachment_path.split('/').pop();
        }
        // Nettoyage final pour éviter tout caractère parasite
        fileName = fileName.replace(/^[\s"\[\]]+|[\s"\[\]]+$/g, '');
        const isPdf = fileName.toLowerCase().endsWith('.pdf');
        
        // Approche unifiée pour tous les fichiers
        const response = await axios.get(`/api/tickets/${ticket.id}/download`, {
            responseType: 'blob',
            headers: {
                'Accept': isPdf ? 'application/pdf' : '*/*'
            }
        });

        // Vérification du blob
        if (!(response.data instanceof Blob) || response.data.size === 0) {
            throw new Error('Fichier vide ou invalide');
        }

        // Création de l'URL
        const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
        
        // Création du lien de téléchargement
        const link = document.createElement('a');
        link.href = blobUrl;
        link.setAttribute('download', fileName);
        
        // Déclenchement du téléchargement
        document.body.appendChild(link);
        link.click();
        
        // Nettoyage
        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        }, 100);

    } catch (error) {
        console.error('Erreur téléchargement:', error);
        setError(`Échec du téléchargement: ${error.message}`);
        
        // Journalisation supplémentaire pour le débogage
        if (error.response) {
            console.error('Détails erreur:', {
                status: error.response.status,
                headers: error.response.headers,
                data: error.response.data
            });
        }
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    setCommentLoading(true);
    setCommentError('');
    setCommentSuccess('');
    try {
      const response = await axios.post(`/api/tickets/${ticket.id}/comment`, { content: comment });
      setCommentSuccess('Commentaire ajouté avec succès !');
      setComment('');
      // Rafraîchir les données du ticket
      const updatedTicket = await axios.get(`/api/tickets/${id}`);
      setTicket(updatedTicket.data);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Erreur lors de l\'ajout du commentaire';
      setCommentError(errorMessage);
    } finally {
      setCommentLoading(false);
    }
  };

  // Fonction pour formater les commentaires
  const formatComments = (commentString) => {
    if (!commentString) return [];
    
    // Diviser les commentaires par les doubles sauts de ligne
    const comments = commentString.split('\n\n').filter(c => c.trim());
    
    return comments.map(comment => {
      // Extraire l'ID utilisateur, la date et le contenu
      const match = comment.match(/\[(.*?)\|(.*?)\](.*)/s);
      if (match) {
        return {
          userId: match[1],
          date: match[2],
          content: match[3].trim()
        };
      }
      return {
        userId: null,
        date: new Date().toLocaleString('fr-FR'),
        content: comment.trim()
      };
    });
  };

  const scrollToCommentSection = () => {
    commentSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToReportsSection = () => {
    reportsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getLastComment = (comments) => {
    if (!comments || comments.length === 0) return null;
    return {
      lastComment: comments[comments.length - 1],
      totalCount: comments.length
    };
  };

  // Observer pour détecter quand la section des rapports est visible
  useEffect(() => {
    if (!reportsSectionRef.current || !hasUnviewedReports) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          markReportsAsViewed();
          // Mettre à jour l'état local immédiatement
          setHasUnviewedReports(false);
          setFilteredReports(prevReports => 
            prevReports.map(report => ({ ...report, is_viewed: true }))
          );
        }
      },
      { threshold: 0.5 } // Déclencher quand 50% de la section est visible
    );

    observer.observe(reportsSectionRef.current);

    return () => {
      if (reportsSectionRef.current) {
        observer.unobserve(reportsSectionRef.current);
      }
    };
  }, [hasUnviewedReports, id]);

  // Fonction pour marquer les rapports comme vus
  const markReportsAsViewed = async () => {
    if (!hasUnviewedReports) return;
    
    try {
      const response = await axios.post(`/api/tickets/${id}/reports/mark-as-viewed`);
      console.log('Reports marqués comme vus:', response.data);
      
      // Mettre à jour l'état local
      setHasUnviewedReports(false);
      setFilteredReports(prevReports => 
        prevReports.map(report => ({ ...report, is_viewed: true }))
      );

      // Mettre à jour le ticket dans la liste des tickets
      const updatedTicket = await axios.get(`/api/tickets/${id}`);
      setTicket(updatedTicket.data);

      // Émettre un événement pour informer la liste des tickets
      window.dispatchEvent(new CustomEvent('reportsViewed', {
        detail: { ticketId: id }
      }));
    } catch (err) {
      console.error('Erreur lors du marquage des rapports comme vus:', err);
      if (err.response?.status === 403) {
        // Si l'utilisateur n'est pas le créateur du ticket
        setError('Seul le créateur du ticket peut marquer les rapports comme vus');
      } else {
        setError('Erreur lors du marquage des rapports comme vus');
      }
    }
  };

  const handleFileChange = (e) => {
    setReportAttachment(e.target.files[0]);
  };

  // Fonction pour télécharger la pièce jointe d'un rapport
  const handleReportDownload = async (reportId, attachmentPath) => {
    try {
        setError(''); // Réinitialiser l'erreur
        const fileName = attachmentPath.split('/').pop();
        const isPdf = fileName.toLowerCase().endsWith('.pdf');
        
        // Utiliser une route spécifique pour le téléchargement des pièces jointes de rapport si nécessaire, ou adapter celle existante
        // Pour l'instant, adaptons la route existante si elle peut prendre le chemin en paramètre ou utiliser un ID de rapport
        // Supposons une nouvelle route backend: /api/reports/{reportId}/download-attachment

        const response = await axios.get(`/api/reports/${reportId}/download-attachment`, {
            responseType: 'blob', // important for downloading files
            headers: {
                'Accept': isPdf ? 'application/pdf' : '*/*'
            }
        });

        // Vérification du blob
        if (!(response.data instanceof Blob) || response.data.size === 0) {
            throw new Error('Fichier vide ou invalide');
        }

        // Création de l'URL
        const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
        
        // Création du lien de téléchargement
        const link = document.createElement('a');
        link.href = blobUrl;
        link.setAttribute('download', fileName);
        
        // Déclenchement du téléchargement
        document.body.appendChild(link);
        link.click();
        
        // Nettoyage
        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        }, 100);

    } catch (error) {
        console.error('Erreur téléchargement pièce jointe rapport:', error);
        setError(`Échec du téléchargement de la pièce jointe du rapport: ${error.message}`);
        
        // Journalisation supplémentaire pour le débogage
        if (error.response) {
            console.error('Détails erreur:', {
                status: error.response.status,
                headers: error.response.headers,
                data: error.response.data
            });
        }
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/tickets/${id}`);
      navigate('/tickets');
    } catch (err) {
      console.error('Erreur lors de la suppression du ticket:', err);
      setError('Erreur lors de la suppression du ticket');
    }
  };

  const handleEditComment = (comment, index) => {
    setEditingCommentIndex(index);
    setEditCommentContent(comment.content);
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

  if (error) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      </Layout>
    );
  }

  if (!ticket) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            Ticket non trouvé
          </div>
        </div>
      </Layout>
    );
  }

  console.log('DateCreation:', ticket.DateCreation);
  console.log('DateDebut:', ticket.DateDebut);
  console.log('DateFinPrevue:', ticket.DateFinPrevue);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Détails du ticket</h1>
          <div className="flex space-x-4">
            <Link
              to="/tickets"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Retour à la liste
            </Link>
            {user && ticket && Number(user.id) === Number(ticket.Id_Utilisat) && (ticket.Id_Statut === 1 || ticket.Id_Statut === 2) && (
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/tickets/${id}/edit`)}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Modifier
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  Supprimer
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {ticket.Titre}
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                  {ticket.statut?.designation || 'Sans statut'}
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700 border border-green-200">
                  {ticket.priorite?.designation || 'Sans priorité'}
                </span>
                {ticket.reports && ticket.reports.filter(report => !report.is_viewed).length > 0 && 
                 ticket.Id_Demandeur === user?.id && (
                  <button
                    onClick={scrollToReportsSection}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 transition-colors cursor-pointer"
                  >
                    {ticket.reports.filter(report => !report.is_viewed).length} rapport(s) non lu(s)
                  </button>
                )}
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={scrollToCommentSection}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                Ajouter un commentaire
              </button>
              {user?.niveau === 2 && (
                <button
                  className="ml-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                  onClick={() => setShowReportModal(true)}
                >
                  Report
                </button>
              )}
            </div>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {ticket.Description || 'Aucune description'}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Commentaires</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {ticket.formatted_comments && ticket.formatted_comments.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1">
                          <div className="text-gray-900">
                            {getLastComment(ticket.formatted_comments).lastComment.content}
                          </div>
                          <div className="text-sm text-gray-500">
                            {getLastComment(ticket.formatted_comments).lastComment.user?.designation || 'Utilisateur'} • {getLastComment(ticket.formatted_comments).lastComment.date}
                          </div>
                        </div>
                        {ticket.formatted_comments.length > 1 && (
                          <button
                            onClick={() => {
                              setShowAllComments(true);
                              scrollToCommentSection();
                            }}
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            +{ticket.formatted_comments.length - 1}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-500">Aucun commentaire</span>
                  )}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Demandeur</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {ticket.demandeur?.designation || 'Non spécifié'}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Exécutant</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {ticket.executant?.nom || ticket.executant?.designation || 'Non assigné'}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Société</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {ticket.societe?.designation || 'Non spécifiée'}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Emplacement</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {ticket.emplacement?.designation || 'Non spécifié'}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Catégorie</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {ticket.categorie?.designation || 'Non spécifiée'}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Date de création</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {formatDate(ticket.DateCreation)}
                </dd>
              </div>
              {ticket.Id_Statut === 6 ? (
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Date de refus</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {formatDate(ticket.reports?.findLast(report => report.type === 'rejet')?.DateReport)}
                  </dd>
                </div>
              ) : (
                <>
                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Date de début</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {formatDate(ticket.DateDebut)}
                    </dd>
                  </div>
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Date de fin prévue</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {formatDate(ticket.DateFinPrevue)}
                    </dd>
                  </div>
                </>
              )}
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Raison du refus </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {ticket.reports && ticket.reports.some(report => report.type === 'rejet') && (
                    <div>
                     
                      <span className="ml-2 text-sm text-gray-900">
                        {ticket.reports.findLast(report => report.type === 'rejet')?.Raison || 'Non spécifiée'}
                      </span>
                    </div>
                  )}
                </dd>
              </div>
              {ticket.DateFinReelle && (
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Date de fin réelle</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {formatDate(ticket.DateFinReelle)}
                  </dd>
                </div>
              )}
              {ticket.attachment_path && (
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Pièce jointe</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <div className="flex items-center space-x-4">
                      {(() => {
                        let fileName = '';
                        try {
                          const paths = JSON.parse(ticket.attachment_path);
                          if (Array.isArray(paths) && paths.length > 0) {
                            fileName = paths[0].split('/').pop();
                          }
                        } catch {
                          fileName = ticket.attachment_path.split('/').pop();
                        }
                        return <span className="text-gray-600">{fileName}</span>;
                      })()}
                      <button
                        onClick={handleDownload}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Télécharger
                      </button>
                    </div>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg mt-6" ref={reportsSectionRef}>
            <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Reports
                    {hasUnviewedReports && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Nouveaux
                        </span>
                    )}
                </h3>
            </div>
            <div className="border-t border-gray-200">
                {filteredReports.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                        {filteredReports.map(report => {
                            console.log('Inspecting Report Object:', report);
                            return (
                                <li key={report.id} className="px-4 py-4 sm:px-6">
                                    <div className="text-sm text-gray-800">{report.Raison}</div>
                                    <div className="text-sm text-gray-500 mt-1">
                                        Reporté par {report.responsable?.designation} le {formatDate(report.DateReport)}
                                    </div>
                                    {report.attachment_path && (
                                      <div className="mt-2 text-sm">
                                        <span className="text-gray-500">Pièce jointe :</span>
                                        <button
                                          onClick={() => handleReportDownload(report.id, report.attachment_path)}
                                          className="ml-1 text-blue-600 hover:text-blue-800 font-medium underline"
                                        >
                                          {report.attachment_path.split('/').pop()}
                                        </button>
                                      </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <div className="px-4 py-4 sm:px-6 text-sm text-gray-500">
                        Aucun report disponible.
                    </div>
                )}
            </div>
        </div>

        {/* Modal Report */}
        {showReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
              <button
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl"
                onClick={() => setShowReportModal(false)}
                aria-label="Fermer"
              >
                ×
              </button>
              <h2 className="text-lg font-bold mb-4">Envoyer un report pour ce ticket</h2>
              <form onSubmit={handleReportSubmit} className="space-y-4">
                <div>
                  <label htmlFor="raison" className="block text-sm font-medium text-gray-700 mb-1">
                    Raison du report
                  </label>
                  <textarea
                    id="raison"
                    value={reportRaison}
                    onChange={e => setReportRaison(e.target.value)}
                    required
                    rows={4}
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
                  />
                </div>

                {/* Champ pour la pièce jointe */}
                <div>
                  <label htmlFor="reportAttachment" className="block text-sm font-medium text-gray-700 mb-1">
                    Pièce jointe (Optionnel)
                  </label>
                  <input
                    type="file"
                    id="reportAttachment"
                    onChange={handleFileChange}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {reportAttachment && (
                    <p className="mt-2 text-sm text-gray-500">Fichier sélectionné : {reportAttachment.name}</p>
                  )}
                </div>

                {reportError && <p className="text-red-500 text-sm">{reportError}</p>}
                {reportSuccess && <p className="text-green-600 text-sm">{reportSuccess}</p>}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                    onClick={() => setShowReportModal(false)}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    disabled={reportLoading}
                  >
                    {reportLoading ? 'Envoi...' : 'Envoyer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Section des commentaires */}
        <div ref={commentSectionRef} className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Commentaires
            </h3>
            <span className="text-sm text-gray-500">
              {ticket.formatted_comments?.length || 0} commentaire(s)
            </span>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            {ticket.formatted_comments && ticket.formatted_comments.length > 0 ? (
              <div className="space-y-6">
                {ticket.formatted_comments.map((comment, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-indigo-600 font-medium">
                            {(comment.user?.designation || 'U')[0].toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-medium text-gray-900">
                            {comment.user?.designation || 'Utilisateur'}
                          </p>
                          <div className="flex items-center space-x-2">
                            <p className="text-sm text-gray-500">
                              {comment.date}
                            </p>
                            {user && comment.user?.designation === user.designation && (
                              <button
                                onClick={() => handleEditComment(comment, index)}
                                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                                aria-label="Modifier le commentaire"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                        {editingCommentIndex === index ? (
                          <form
                            onSubmit={async e => {
                              e.preventDefault();
                              const commentObj = ticket.formatted_comments[index];
                              const commentId = md5(commentObj.user.designation + commentObj.date + commentObj.content);
                              try {
                                const response = await axios.put(`/api/tickets/${ticket.id}/comment/${commentId}`, { content: editCommentContent });
                                
                                // Mettre à jour l'état local immédiatement
                                const updatedComments = [...ticket.formatted_comments];
                                updatedComments[index] = {
                                  ...updatedComments[index],
                                  content: editCommentContent
                                };
                                
                                setTicket(prevTicket => ({
                                  ...prevTicket,
                                  formatted_comments: updatedComments
                                }));
                                
                                setEditingCommentIndex(null);
                                setEditCommentContent('');
                              } catch (err) {
                                console.error('Erreur lors de la modification du commentaire:', err);
                                alert('Erreur lors de la modification du commentaire');
                              }
                            }}
                            className="mt-2"
                          >
                            <textarea
                              value={editCommentContent}
                              onChange={e => setEditCommentContent(e.target.value)}
                              className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              rows={3}
                            />
                            <div className="mt-2 flex justify-end space-x-2">
                              <button
                                type="button"
                                onClick={() => setEditingCommentIndex(null)}
                                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                              >
                                Annuler
                              </button>
                              <button
                                type="submit"
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                              >
                                Enregistrer
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="mt-2 text-sm text-gray-900 whitespace-pre-wrap break-words">
                            {comment.content}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Aucun commentaire</p>
                <p className="text-sm text-gray-400 mt-2">Soyez le premier à commenter</p>
              </div>
            )}

            {/* Formulaire d'ajout de commentaire */}
            <div className="mt-6">
              <form onSubmit={handleCommentSubmit} className="space-y-4">
                <div>
                  <label htmlFor="comment" className="block text-sm font-medium text-gray-700">
                    Ajouter un commentaire
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="comment"
                      name="comment"
                      rows={3}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Écrivez votre commentaire ici..."
                    />
                  </div>
                </div>
                {commentError && (
                  <div className="text-red-600 text-sm">{commentError}</div>
                )}
                {commentSuccess && (
                  <div className="text-green-600 text-sm">{commentSuccess}</div>
                )}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={commentLoading || !comment.trim()}
                    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                      commentLoading || !comment.trim()
                        ? 'bg-indigo-300 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                    }`}
                  >
                    {commentLoading ? 'Envoi...' : 'Publier'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Modal de confirmation de suppression */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Confirmer la suppression
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Êtes-vous sûr de vouloir supprimer ce ticket ? Cette action est irréversible.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={() => {
                      setShowDeleteModal(false);
                      handleDelete();
                    }}
                  >
                    Supprimer
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={() => setShowDeleteModal(false)}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal d'édition */}
        {showEditModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Modifier le ticket</h3>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    ×
                  </button>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Vous allez être redirigé vers la page de modification du ticket.
                  </p>
                </div>
                <div className="mt-4 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-base font-medium rounded-md shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      navigate(`/tickets/${id}/edit`);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Continuer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default TicketDetails; 