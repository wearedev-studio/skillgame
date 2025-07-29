import axios from 'axios';

const apiClient = axios.create({
    baseURL: 'http://localhost:5001/api', // URL нашего бэкенда
    headers: {
        'Content-Type': 'application/json',
    },
});

// ▼▼▼ ВОТ ЭТО ВАЖНАЯ ЧАСТЬ ▼▼▼
// Interceptor для добавления токена авторизации в заголовок
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default apiClient;
