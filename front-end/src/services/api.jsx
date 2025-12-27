// src/services/api.jsx

// Configuração de URLs
const API_URL = import.meta.env.VITE_PRODUCT_API_URL || 'http://localhost:5001';

// Gerenciamento de Token
const getToken = () => localStorage.getItem('auth_token');
const setToken = (token) => localStorage.setItem('auth_token', token);
const setUserInfo = (user) => localStorage.setItem('user_info', JSON.stringify(user));

export const getUserInfo = () => {
    const userStr = localStorage.getItem('user_info');
    return userStr ? JSON.parse(userStr) : null;
};

export const getCurrentUser = () => getUserInfo();

export const removeToken = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
};

// --- Headers Auxiliar ---
const getHeaders = () => {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
};

// --- API de Autenticação ---
export const authApi = {
    login: async (email, password) => {
        try {
            const formData = new URLSearchParams();
            formData.append('username', email); 
            formData.append('password', password);

            const response = await fetch(`${API_URL}/api/v1/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Falha no login');
            }

            // Salvar Token
            if (data.access_token) {
                setToken(data.access_token);
                
                // Buscar dados do usuário após login para pegar a role correta
                const userResponse = await fetch(`${API_URL}/api/v1/users/me`, {
                    headers: { 'Authorization': `Bearer ${data.access_token}` }
                });
                
                if (userResponse.ok) {
                    const userData = await userResponse.json();
                    setUserInfo(userData);
                    return { success: true, user: userData };
                }
            }
            return { success: false, error: 'Token não recebido' };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    },

    register: async (username, email, password) => {
        try {
            const response = await fetch(`${API_URL}/api/v1/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                const msg = Array.isArray(data.detail) 
                    ? data.detail.map(d => d.msg).join(', ') 
                    : data.detail;
                throw new Error(msg || 'Erro no registro');
            }

            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    logout: () => {
        removeToken();
        window.location.href = '/';
    }
};

// API de Produtos (FastAPI)
export const api = {
    health: async () => {
        const response = await fetch(`${API_URL}/health`);
        return response.json();
    },

    hs: async () => {
        try {
            const response = await fetch(`${API_URL}/api/handshake`);
            if (!response.ok) throw new Error(`Status: ${response.status}`);
            return response.json();
        } catch (error) {
            return { error: true, message: error.message };
        }
    },
    
    getDashboardStats: async () => {
        const response = await fetch(`${API_URL}/api/dashboard/stats`, {
            headers: getHeaders()
        });
        if (!response.ok) return handleApiError({ message: response.statusText });
        return response.json();
    },
    
    getCategories: async (page = 1, limit = 20, search = '') => {
        const response = await fetch(
            `${API_URL}/api/categories?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`,
            { headers: getHeaders() }
        );
        return response.json();
    },
    
    getCategoryDetail: async (categoryId) => {
        const response = await fetch(`${API_URL}/api/categories/${categoryId}`, {
            headers: getHeaders()
        });
        return response.json();
    },
    
    getProducts: async (page = 1, limit = 20, category = '', search = '') => {
        let url = `${API_URL}/api/products?page=${page}&limit=${limit}`;
        if (category) url += `&category=${encodeURIComponent(category)}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        
        const response = await fetch(url, { headers: getHeaders() });
        return response.json();
    },
    
    getProductDetail: async (productId) => {
        const response = await fetch(`${API_URL}/api/products/${productId}`, {
            headers: getHeaders()
        });
        return response.json();
    },
    
    searchItems: async (query, limit = 10) => {
        const response = await fetch(
            `${API_URL}/api/items?search=${encodeURIComponent(query)}&limit=${limit}`,
            { headers: getHeaders() }
        );
        return response.json();
    },
    
    getConfig: async () => {
        const response = await fetch(`${API_URL}/api/config`);
        return response.json();
    }
};

// Helper para lidar com erros de API
export const handleApiError = (error) => {
    console.error('API Error:', error);
    let message = error.message || 'Error connecting to API';
    
    if (message.includes('401')) {
        message = 'Sessão expirada.';
        removeToken();
    }
    return { error: true, message, data: null };
};

// Verificar se usuário está autenticado
export const isAuthenticated = () => {
    const token = getToken();
    const user = getUserInfo();
    return !!(token && user);
};

// Verificar se usuário tem role específica
export const hasRole = (requiredRole) => {
    const user = getUserInfo();
    if (!user) return false;
    return user.role === requiredRole;
};

// Obter categorias permitidas para o usuário
export const getAllowedCategories = () => {
    const user = getUserInfo();
    if (!user) return ['Motores'];
    return user.allowed_categories || ['Motores'];
};