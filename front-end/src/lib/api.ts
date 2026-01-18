export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
import type { UserCreate } from "@/types";

// Função auxiliar para tratar erros
async function handleResponse(response: Response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erro na API' }));
    throw new Error(error.detail || 'Falha na requisição');
  }
  return response.json();
}

// --- CATEGORIAS ---

export const getCategories = async () => {
  const token = getAuthToken(); // 1. Pega o token
  
  const response = await fetch(`${API_BASE_URL}/categories`, {
    headers: {
      'Authorization': `Bearer ${token}`, // 2. Envia o token
      'Content-Type': 'application/json',
    },
  });

  // 3. Verifica se o token expirou
  if (response.status === 401) {
    logout();
    throw new Error("Sessão expirada.");
  }

  return handleResponse(response);
};

export const getCategoryBySlug = async (slug: string) => {
  const token = getAuthToken(); // 1. Pega o token

  const response = await fetch(`${API_BASE_URL}/products/${slug}`, {
    headers: {
      'Authorization': `Bearer ${token}`, // 2. Envia o token
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 401) {
    logout();
    throw new Error("Sessão expirada.");
  }

  return handleResponse(response);
};

// --- PRODUTOS ---

export const getProducts = async () => {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/products`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  // Se o token estiver expirado ou inválido (401), desloga o usuário
  if (response.status === 401) {
    logout();
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  return handleResponse(response);
};

export const getProductsByCategory = async (categorySlug: string) => {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/products/${categorySlug}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 401) {
    logout();
    throw new Error("Sessão expirada.");
  }

  return handleResponse(response);
};

export const getProductById = async (id: string) => {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/products/code/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 401) {
    logout();
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  return handleResponse(response);
};

export const getProductByCode = async (code: string) => {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/products/code/${code}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  // Se o token estiver expirado ou inválido (401), desloga o usuário
  if (response.status === 401) {
    logout();
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  return handleResponse(response);
};

// --- AUTENTICAÇÃO ---

export const login = async (username: string, password: string) => {
  // O FastAPI espera Body do tipo form-data para o login padrão
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData,
  });

  const data = await handleResponse(response);
  
  // Salva o token no localStorage para usar nas próximas requisições
  if (data.access_token) {
    localStorage.setItem('auth_token', data.access_token);
  }
  
  return data;
};

export const registerUser = async (userData: UserCreate) => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  return handleResponse(response);
};

export const logout = () => {
  localStorage.removeItem('auth_token');
  window.location.href = '/login'; // Redireciona após deslogar
};

// Função para pegar o token salvo
export const getAuthToken = () => localStorage.getItem('auth_token');

export const getCurrentUser = async () => {
  const token = getAuthToken();
  if (!token) {
    throw new Error("No authentication token");
  }

  const response = await fetch(`${API_BASE_URL}/users/me`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 401) {
    logout();
    throw new Error("Sessão expirada.");
  }

  if (!response.ok) {
    throw new Error("Falha ao buscar dados do usuário");
  }

  return handleResponse(response);
};

export const updateCurrentUser = async (userData: any) => {
  const token = getAuthToken();
  if (!token) {
    throw new Error("No authentication token");
  }

  const response = await fetch(`${API_BASE_URL}/users/me`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  if (response.status === 401) {
    logout();
    throw new Error("Sessão expirada.");
  }

  return handleResponse(response);
};
