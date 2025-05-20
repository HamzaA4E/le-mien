import axios from "axios";

// Ensure we have a valid base URL
// Use environment variable VITE_API_URL, default to localhost if not set
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const instance = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
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
        // Don't throw the error, just log it
        return;
    }
};

// Intercepteur pour ajouter le token CSRF à chaque requête
instance.interceptors.request.use(async function (config) {
    // Ensure we're using the correct base URL
    // This is now handled by baseURL configuration on the instance
    // if (!config.url.startsWith('http')) {
    //     config.url = `${API_URL}${config.url}`;
    // }

    // Obtenir un nouveau token CSRF pour les requêtes POST, PUT, DELETE
    if (['post', 'put', 'delete'].includes(config.method?.toLowerCase())) {
        await getCsrfToken();
    }

    const token = document.cookie.split('; ').find(row => row.startsWith('XSRF-TOKEN='))?.split('=')[1];
    if (token) {
        config.headers['X-XSRF-TOKEN'] = decodeURIComponent(token);
    }

    // Ajouter le token d'authentification si présent
    const authToken = localStorage.getItem('token');
    if (authToken) {
        config.headers.Authorization = `Bearer ${authToken}`;
    }

    // Check if the request contains a file
    if (config.data instanceof FormData) {
        // Remove the Content-Type header to let the browser set it with the boundary
        delete config.headers['Content-Type'];
        // Ensure we're not using application/x-www-form-urlencoded
        config.headers['Accept'] = 'application/json';
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
    }

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

        return Promise.reject(error);
    }
);

export default instance; 