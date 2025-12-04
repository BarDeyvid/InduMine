// Configuração de URLs
const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:5001';
const PRODUCT_API_URL = import.meta.env.VITE_PRODUCT_API_URL || 'http://localhost:8000';

// Gerenciamento de Token
const getToken = () => {
    return localStorage.getItem('auth_token');
};

const setToken = (token) => {
    localStorage.setItem('auth_token', token);
};

const removeToken = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_email');
};

const getUserInfo = () => {
    const userStr = localStorage.getItem('user_info');
    return userStr ? JSON.parse(userStr) : null;
};

const setUserInfo = (user) => {
    localStorage.setItem('user_info', JSON.stringify(user));
    if (user.role) localStorage.setItem('user_role', user.role);
    if (user.username) localStorage.setItem('user_name', user.username);
    if (user.email) localStorage.setItem('user_email', user.email);
};

// Headers para autenticação
const getHeaders = () => {
    const headers = {
        'Content-Type': 'application/json',
    };
    
    const token = getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
};

// API de Autenticação (Express/MongoDB)
export const authApi = {
    login: async (email, password) => {
        try {
            const response = await fetch(`${AUTH_API_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Login error response:', errorText);
                
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { message: errorText || 'Login failed' };
                }
                
                throw new Error(errorData.message || errorData.detail || 'Login failed');
            }
            
            const data = await response.json();
            
            if (data.access_token) {
                setToken(data.access_token);
                setUserInfo(data.user);
                return {
                    success: true,
                    user: data.user,
                    token: data.access_token
                };
            }
            
            throw new Error('No token received');
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    register: async (username, email, password, role = 'guest') => {
        try {
            const response = await fetch(`${AUTH_API_URL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, email, password, role })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Register error response:', errorText);
                
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { message: errorText || 'Registration failed' };
                }
                
                throw new Error(errorData.message || errorData.detail || 'Registration failed');
            }
            
            const data = await response.json();
            
            if (data.access_token) {
                setToken(data.access_token);
                setUserInfo(data.user);
                return {
                    success: true,
                    user: data.user,
                    token: data.access_token
                };
            }
            
            throw new Error('No token received');
        } catch (error) {
            console.error('Register error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    logout: () => {
        removeToken();
        window.location.href = '/';
    },
    
    getCurrentUser: () => {
        return getUserInfo();
    },
    
    verifyToken: async () => {
        const token = getToken();
        if (!token) return { valid: false, user: null };
        
        try {
            const response = await fetch(`${AUTH_API_URL}/api/auth/verify`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) {
                removeToken();
                return { valid: false, user: null };
            }
            
            const data = await response.json();
            return { valid: true, user: data.user };
        } catch (error) {
            console.error('Token verification error:', error);
            removeToken();
            return { valid: false, user: null };
        }
    },
    
    // Usuários demo (para login rápido)
    demoLogin: async (role = 'guest') => {
        const demoUsers = {
            'admin': { email: 'admin@weg.com', password: '1234' },
            'engineer': { email: 'engineer@weg.com', password: 'engineer123' },
            'sales': { email: 'sales@weg.com', password: 'sales123' },
            'guest': { email: 'guest@weg.com', password: 'guest123' }
        };
        
        const demoUser = demoUsers[role] || demoUsers.guest;
        return authApi.login(demoUser.email, demoUser.password);
    },

    // Inicializar usuários demo
    initDemoUsers: async () => {
        try {
            const response = await fetch(`${AUTH_API_URL}/api/auth/init-demo`);
            return response.json();
        } catch (error) {
            console.error('Failed to init demo users:', error);
            return { success: false, error: error.message };
        }
    }
};

// API de Produtos (FastAPI)
export const api = {
    // Verificar saúde da API FastAPI
    health: async () => {
        const response = await fetch(`${PRODUCT_API_URL}/api/health`);
        return response.json();
    },

    // Wake-up endpoint
    hs: async () => {
        try {
            const response = await fetch(`${PRODUCT_API_URL}/api/handshake`);
            if (!response.ok) {
                throw new Error(`HTTP Error! Status: ${response.status}`);
            }
            return response.json();
        } catch (error) {
            console.error("Handshake/Wake-up error:", error);
            return { error: true, message: error.message };
        }
    },
    
    // Dashboard (requer autenticação)
    getDashboardStats: async () => {
        const response = await fetch(`${PRODUCT_API_URL}/api/dashboard/stats`, {
            headers: getHeaders()
        });
        if (response.status === 401) {
            throw new Error('Authentication required');
        }
        if (response.status === 403) {
            throw new Error('Access denied');
        }
        return response.json();
    },
    
    // Categorias (requer autenticação)
    getCategories: async (page = 1, limit = 20, search = '') => {
        const response = await fetch(
            `${PRODUCT_API_URL}/api/categories?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`,
            { headers: getHeaders() }
        );
        if (response.status === 401) {
            throw new Error('Authentication required');
        }
        if (response.status === 403) {
            throw new Error('Access denied');
        }
        return response.json();
    },
    
    getCategoryDetail: async (categoryId) => {
        const response = await fetch(`${PRODUCT_API_URL}/api/categories/${categoryId}`, {
            headers: getHeaders()
        });
        if (!response.ok) {
            if (response.status === 401) throw new Error('Authentication required');
            if (response.status === 403) throw new Error('Access denied to this category');
            if (response.status === 404) throw new Error('Category not found');
        }
        return response.json();
    },
    
    // Produtos (requer autenticação)
    getProducts: async (page = 1, limit = 20, category = '', search = '') => {
        let url = `${PRODUCT_API_URL}/api/products?page=${page}&limit=${limit}`;
        if (category) url += `&category=${encodeURIComponent(category)}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        
        const response = await fetch(url, {
            headers: getHeaders()
        });
        if (response.status === 401) {
            throw new Error('Authentication required');
        }
        if (response.status === 403) {
            throw new Error('Access denied');
        }
        return response.json();
    },
    
    getProductDetail: async (productId) => {
        const response = await fetch(`${PRODUCT_API_URL}/api/products/${productId}`, {
            headers: getHeaders()
        });
        if (!response.ok) {
            if (response.status === 401) throw new Error('Authentication required');
            if (response.status === 403) throw new Error('Access denied to this product');
            if (response.status === 404) throw new Error('Product not found');
        }
        return response.json();
    },
    
    // Busca (funciona com ou sem autenticação)
    searchItems: async (query, limit = 10) => {
        const response = await fetch(
            `${PRODUCT_API_URL}/api/items?search=${encodeURIComponent(query)}&limit=${limit}`,
            { headers: getHeaders() }
        );
        return response.json();
    },
    
    // Endpoints públicos (não requerem autenticação)
    getPublicCategories: async (limit = 5) => {
        const response = await fetch(`${PRODUCT_API_URL}/api/public/categories?limit=${limit}`);
        return response.json();
    },
    
    getPublicProducts: async (limit = 5) => {
        const response = await fetch(`${PRODUCT_API_URL}/api/public/products?limit=${limit}`);
        return response.json();
    },
    
    // Configuração
    getConfig: async () => {
        const response = await fetch(`${PRODUCT_API_URL}/api/config`);
        return response.json();
    },
    
    // Demo endpoints para teste
    getDemoUsers: () => {
        return {
            admin: { email: 'admin@weg.com', password: '1234' },
            engineer: { email: 'engineer@weg.com', password: 'engineer123' },
            sales: { email: 'sales@weg.com', password: 'sales123' },
            guest: { email: 'guest@weg.com', password: 'guest123' }
        };
    }
};

// Helper para lidar com erros de API
export const handleApiError = (error) => {
    console.error('API Error:', error);
    
    let message = error.message || 'Error connecting to API';
    
    if (message.includes('401') || message.includes('Authentication required')) {
        message = 'Authentication required. Please login again.';
        removeToken();
    } else if (message.includes('403') || message.includes('Access denied')) {
        message = 'Access denied. You do not have permission to access this resource.';
    } else if (message.includes('404')) {
        message = 'Resource not found.';
    } else if (message.includes('Network Error') || message.includes('Failed to fetch')) {
        message = 'Network error. Please check your connection and try again.';
    }
    
    return {
        error: true,
        message,
        data: null
    };
};

// Higher-order function para verificar autenticação
export const withAuth = async (apiCall, params = []) => {
    const user = authApi.getCurrentUser();
    if (!user) {
        throw new Error('Authentication required');
    }
    
    try {
        return await apiCall(...params);
    } catch (error) {
        if (error.message.includes('Authentication required') || error.message.includes('401')) {
            const verification = await authApi.verifyToken();
            if (!verification.valid) {
                removeToken();
                throw new Error('Session expired. Please login again.');
            }
        }
        throw error;
    }
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
    if (!user) return ['Motores']; // Default guest categories
    return user.allowed_categories || ['Motores'];
};