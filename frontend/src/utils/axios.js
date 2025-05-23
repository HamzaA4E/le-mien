import axios from "axios";

// Déterminer l'URL de base en fonction de l'URL actuelle
const getBaseUrl = () => {
    const currentUrl = window.location.origin;
    // Utiliser toujours l'URL actuelle pour les requêtes API
    return currentUrl;
};

const API_URL = getBaseUrl();
console.log('API URL:', API_URL); // Pour le débogage

const instance = axios.create({
    baseURL: API_URL,
    headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    },
    withCredentials: true
});

// Fonction pour obtenir un nouveau token CSRF
const getCsrfToken = async () => {
    try {
        const response = await instance.get('/sanctum/csrf-cookie');
        console.log('CSRF Token Response:', response);
        return response;
    } catch (error) {
        console.error('Erreur lors de la récupération du token CSRF:', error);
        return;
    }
};

// Intercepteur pour ajouter le token d'authentification
instance.interceptors.request.use(async function (config) {
    // Ajouter le token d'authentification si présent
    const authToken = localStorage.getItem('token');
    if (authToken) {
        config.headers.Authorization = `Bearer ${authToken}`;
    }

    // Si c'est une requête avec FormData, laisser le navigateur gérer le Content-Type
    if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
    } else {
        config.headers['Content-Type'] = 'application/json';
    }

    // Log de la configuration de la requête
    console.log('Request Config:', {
        url: config.url,
        method: config.method,
        headers: config.headers,
        data: config.data instanceof FormData ? 'FormData' : config.data
    });

    return config;
});

// Intercepteur pour gérer les erreurs
instance.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;

        // Si l'erreur est 401 et que ce n'est pas une tentative de réessai
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            // Si c'est une erreur d'authentification (token expiré ou invalide)
            if (error.response.data?.message === 'Unauthenticated.') {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
                return Promise.reject(error);
            }

            // Si c'est une erreur CSRF, essayer de récupérer un nouveau token
            if (error.response.data?.message === 'CSRF token mismatch.') {
                await getCsrfToken();
                return instance(originalRequest);
            }
        }

        // Gérer les erreurs 404
        if (error.response?.status === 404) {
            console.error('Route non trouvée:', originalRequest.url);
            // Vous pouvez rediriger vers une page 404 ou afficher un message
        }

        return Promise.reject(error);
    }
);

export default instance; 