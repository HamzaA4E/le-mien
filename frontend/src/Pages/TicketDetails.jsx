import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from '../utils/axios';
import Layout from '../components/Layout';
import TicketReport from '../components/TicketReport';

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
  const [user, setUser] = useState(null);
  const [filteredReports, setFilteredReports] = useState([]);
  const [comment, setComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [commentSuccess, setCommentSuccess] = useState('');
  const [showAllComments, setShowAllComments] = useState(true);
  const commentSectionRef = useRef(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get('/api/user');
        setUser(response.data);
        console.log('User data fetched:', response.data);
        console.log('User access level:', response.data?.niveau_acces);
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
        console.log('Pièce jointe:', response.data.attachment);
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
    } else if (ticket && !ticket?.reports) {
       // If ticket data is loaded but no reports, set to empty array
       setFilteredReports([]);
    } else {
        // If ticket is null or still loading, set to empty array
        setFilteredReports([]);
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
    try {
      const response = await axios.post(`/api/tickets/${ticket.id}/reports`, { raison: reportRaison });
      setReportSuccess('Report créé avec succès !');
      setReportRaison('');
      setTimeout(() => setShowReportModal(false), 1000);
    } catch (err) {
      console.error('Erreur complète:', err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Erreur lors de la création du report';
      setReportError(errorMessage);
    } finally {
      setReportLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
        setError('');
        const fileName = ticket.attachment_path.split('/').pop();
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

  const getLastComment = (comments) => {
    if (!comments || comments.length === 0) return null;
    return {
      lastComment: comments[comments.length - 1],
      totalCount: comments.length
    };
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
            <Link
              to={`/tickets/${id}/edit`}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Modifier
            </Link>
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {ticket.Titre}
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {ticket.statut?.designation || 'Sans statut'}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {ticket.priorite?.designation || 'Sans priorité'}
                </span>
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
                  {ticket.executant?.designation || 'Non assigné'}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Société</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {ticket.societe?.designation || 'Non spécifiée'}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Emplacement</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {ticket.emplacement?.designation || 'Non spécifié'}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Catégorie</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {ticket.categorie?.designation || 'Non spécifiée'}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Type de demande</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {ticket.type_demande?.designation || 'Non spécifié'}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Date de création</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {formatDate(ticket.DateCreation)}
                </dd>
              </div>
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
                      <span className="text-gray-600">{ticket.attachment_path.split('/').pop()}</span>
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

        <div className="bg-white shadow overflow-hidden sm:rounded-lg mt-6">
            <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Reports</h3>
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
              <h2 className="text-lg font-bold mb-4">Créer un report pour ce ticket</h2>
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
                    {reportLoading ? 'Création...' : 'Créer'}
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
                          <p className="text-sm text-gray-500">
                            {comment.date}
                          </p>
                        </div>
                        <div className="mt-2 text-sm text-gray-900 whitespace-pre-wrap break-words">
                          {comment.content}
                        </div>
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
      </div>
    </Layout>
  );
};

export default TicketDetails; 