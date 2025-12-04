import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000/api/v1',
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' }
});

// 401 Unauthorized handler
let unauthorizedHandler = null;

export const registerUnauthorizedHandler = (handler) => {
    unauthorizedHandler = handler;
};

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && unauthorizedHandler) {
            unauthorizedHandler();
        }
        return Promise.reject(error);
    }
);

export default api;