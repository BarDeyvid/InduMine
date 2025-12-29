import requests
import uuid
import json

# Configuração da URL Base (conforme sua porta 5001 e prefixo /api/v1)
BASE_URL = "http://localhost:5001/api/v1"

def print_step(title):
    print(f"\n{'='*10} {title} {'='*10}")

def log_response(response):
    try:
        data = response.json()
    except:
        data = response.text
    
    status = response.status_code
    print(f"Status: {status}")
    if status < 400:
        print(f"Sucesso: {data}")
    else:
        print(f"Erro: {data}")
    return status, data

def test_api():
    # ==========================================
    # 1. Testar Health Check e Endpoints Públicos
    # ==========================================
    print_step("Testando Health Check")
    try:
        resp = requests.get(f"{BASE_URL}/health")
        log_response(resp)
    except requests.exceptions.ConnectionError:
        print("❌ Não foi possível conectar em localhost:5001. Verifique se a API está rodando.")
        return

    print_step("Testando Categoria Pública")
    resp = requests.get(f"{BASE_URL}/public/categories")
    log_response(resp)

    # ==========================================
    # 2. Fluxo de Autenticação (Register)
    # ==========================================
    print_step("Testando Registro de Usuário")
    
    # Gerar dados aleatórios para permitir múltiplos testes
    random_id = str(uuid.uuid4())[:8]
    email = f"user_{random_id}@teste.com"
    password = "Password@123"
    
    # Payload baseado em schemas comuns de FastAPI (ajuste se seu schema for diferente)
    user_payload = {
        "email": email,
        "password": password,
        "is_active": True,
        "is_superuser": False
        # Adicione "full_name": "Teste" se sua API exigir
    }
    
    print(f"Tentando registrar: {email}")
    resp_register = requests.post(f"{BASE_URL}/auth/register", json=user_payload)
    status, data_register = log_response(resp_register)

    if status not in [200, 201]:
        print("❌ Falha no registro. Abortando testes de login.")
        return

    # ==========================================
    # 3. Fluxo de Autenticação (Login)
    # ==========================================
    print_step("Testando Login")
    
    resp_login_form = requests.post(f"{BASE_URL}/auth/login", data={"username": email, "password": password})
    status, data_login = log_response(resp_login_form)

    token = None
    if status == 200:
        # Tenta extrair o token (pode vir como 'access_token' ou apenas 'token')
        token = data_login.get("access_token") or data_login.get("token")
        
    if not token:
        print("❌ Não foi possível obter o token. Verifique o payload de login.")
    if not token:
        return

    print(f"🔑 Token obtido: {token[:20]}...")

    # ==========================================
    # 4. Testar Rotas Protegidas
    # ==========================================
    print_step("Testando Rota Protegida: /auth/me")
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    resp_me = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    log_response(resp_me)

    print_step("Testando Rota Protegida: /dashboard/stats")
    resp_stats = requests.get(f"{BASE_URL}/dashboard/stats", headers=headers)
    log_response(resp_stats)

    print_step("Testando Rota Protegida: /categories")
    resp_cats = requests.get(f"{BASE_URL}/categories", headers=headers)
    log_response(resp_cats)

if __name__ == "__main__":
    test_api()