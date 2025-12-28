// front-end/src/services/api.jsx
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

// Auth API functions
export const authApi = {
    login: async (email, password) => {
        try {
            // Convert to URLSearchParams for form-urlencoded
            const formData = new URLSearchParams();
            formData.append('username', email);  // Note: backend expects 'username' field
            formData.append('password', password);

            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData,
            });
            
            if (!response.ok) {
                let errorMessage = 'Login failed';
                try {
                    const errorData = await response.json();
                    
                    // Handle FastAPI validation errors
                    if (errorData.detail) {
                        if (Array.isArray(errorData.detail)) {
                            // Multiple validation errors
                            errorMessage = errorData.detail.map(err => err.msg).join(', ');
                        } else {
                            // Single error message
                            errorMessage = errorData.detail;
                        }
                    }
                } catch (parseError) {
                    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                }
                return { success: false, error: errorMessage };
            }
            
            const data = await response.json();
            
            // Store tokens
            if (data.access_token) {
                localStorage.setItem('auth_token', data.access_token);
                
                // If user info is not in the response, fetch it separately
                if (!data.user) {
                    // Get user info using the token
                    const userResponse = await fetch(`${API_BASE_URL}/users/me`, {
                        headers: {
                            'Authorization': `Bearer ${data.access_token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (userResponse.ok) {
                        const userData = await userResponse.json();
                        data.user = userData;
                    }
                }
                
                // Store user info
                if (data.user) {
                    localStorage.setItem('user_info', JSON.stringify(data.user));
                    localStorage.setItem('userName', data.user.username || data.user.email || 'User');
                    localStorage.setItem('userRole', data.user.roles?.[0] || 'user');
                }
            }
            
            return { success: true, user: data.user || {} };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message || 'Network error' };
        }
    },

    register: async (username, email, password) => {
        try {
            // First check if the backend expects JSON for registration
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    username, 
                    email, 
                    password,
                    is_active: true,
                    roles: ["user"]
                }),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                // Handle validation errors
                let errorMessage = data.detail || 'Registration failed';
                if (Array.isArray(data.detail)) {
                    errorMessage = data.detail.map(err => err.msg).join(', ');
                }
                return { success: false, error: errorMessage };
            }
            
            return { success: true, user: data.user || data };
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: error.message || 'Network error' };
        }
    },


    logout: () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_info');
        localStorage.removeItem('userName');
        localStorage.removeItem('userRole');
    }
};

// Main API functions
export const api = {
    // Root endpoints
    health: async () => {
        const response = await fetch(`${API_BASE_URL}/health`);
        return response.json();
    },
    
    // Dashboard endpoints
    getDashboardStats: async () => {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_BASE_URL}/dashboard/stats`, {
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            if (response.status === 401) {
                // Token expired or invalid
                authApi.logout();
                window.location.href = '/';
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    },
    
    // Categories endpoints
    getCategories: async (page = 1, limit = 20, search = '') => {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(
            `${API_BASE_URL}/categories?page=${page}&limit=${limit}&search=${search}`,
            {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json'
                }
            }
        );
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    },
    
    getCategoryDetail: async (categoryId) => {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    },
    
    // Products endpoints
    getProducts: async (page = 1, limit = 20, category = '', search = '') => {
        const token = localStorage.getItem('auth_token');
        let url = `${API_BASE_URL}/products?page=${page}&limit=${limit}`;
        if (category) url += `&category=${category}`;
        if (search) url += `&search=${search}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    },
    
    getProductDetail: async (productId) => {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    },
    
    // Search endpoint
    searchItems: async (query, limit = 10) => {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(
            `${API_BASE_URL}/items?search=${encodeURIComponent(query)}&limit=${limit}`,
            {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Accept': 'application/json',
                }
            }
        );
        if (!response.ok) {
            // Don't throw for search errors, just return empty results
            console.error('Search error:', response.status);
            return { products: [], categories: [] };
        }
        return response.json();
    }
};

// Error handler
export const handleApiError = (error) => {
    console.error('API Error:', error);
    return {
        message: error.message || 'An error occurred',
        status: error.status || 500
    };
};