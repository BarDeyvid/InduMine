let API_BASE_URL;

if (import.meta.env.MODE === 'deploy') {
    API_BASE_URL = 'https://weg-product-api.onrender.com/api'; 
} else {
    API_BASE_URL = 'http://localhost:8000/api'; 
}

export const api = {
    // Verificar saúde da API
    health: async () => {
        const response = await fetch(`${API_BASE_URL}/health`);
        return response.json();
    },

    // Cumprimentar
    hs: async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/handshake`);
            if (!response.ok) {
            throw new Error(`Erro HTTP! Status: ${response.status}`);
        }
        
        return response.json();
    } catch (error) {
        console.error("Erro no Handshake/Wake-up:", error);
        return { error: true, message: error.message }; 
    }
},
    
    // Dashboard
    getDashboardStats: async () => {
        const response = await fetch(`${API_BASE_URL}/dashboard/stats`);
        return response.json();
    },
    
    // Categorias
    getCategories: async (page = 1, limit = 20, search = '') => {
        const response = await fetch(
            `${API_BASE_URL}/categories?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`
        );
        return response.json();
    },
    
    getCategoryDetail: async (categoryId) => {
        const response = await fetch(`${API_BASE_URL}/categories/${categoryId}`);
        if (!response.ok) {
            throw new Error('Categoria não encontrada');
        }
        return response.json();
    },
    
    // Produtos
    getProducts: async (page = 1, limit = 20, category = '', search = '') => {
        let url = `${API_BASE_URL}/products?page=${page}&limit=${limit}`;
        if (category) url += `&category=${encodeURIComponent(category)}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        
        const response = await fetch(url);
        return response.json();
    },
    
    getProductDetail: async (productId) => {
        const response = await fetch(`${API_BASE_URL}/products/${productId}`);
        if (!response.ok) {
            throw new Error('Produto não encontrado');
        }
        return response.json();
    },
    
    // Busca geral (para SearchBar)
    searchItems: async (query, limit = 10) => {
        const response = await fetch(
            `${API_BASE_URL}/items?search=${encodeURIComponent(query)}&limit=${limit}`
        );
        return response.json();
    },
    
    // Busca específica
    search: async (query, type = 'all') => {
        const response = await fetch(
            `${API_BASE_URL}/search?q=${encodeURIComponent(query)}&type=${type}`
        );
        return response.json();
    },
    
    // Dados do dataset
    getColumns: async () => {
        const response = await fetch(`${API_BASE_URL}/columns`);
        return response.json();
    },
    
    getSampleData: async (n = 5) => {
        const response = await fetch(`${API_BASE_URL}/sample?n=${n}`);
        return response.json();
    },
    
    // Total de linhas
    getTotalRows: async () => {
        const response = await fetch('/total_rows');
        return response.json();
    }
};

// Helper para lidar com erros de API
export const handleApiError = (error) => {
    console.error('Erro na API:', error);
    return {
        error: true,
        message: error.message || 'Erro ao conectar com a API',
        data: null
    };
};