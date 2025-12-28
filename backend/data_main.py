from fastapi import FastAPI, Query, HTTPException, Depends, Header, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
import pandas as pd
from typing import List, Dict, Any, Optional
import json
from urllib.parse import unquote
import numpy as np
import math
import os
import jwt
from datetime import datetime, timedelta

app = FastAPI(title="WEG Product API", description="API de Produtos WEG com RBAC")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Variáveis globais para dados
df = pd.DataFrame()
products_db = []
categories_db = []
actual_columns = {}
category_objects = []
data_loaded_successfully = False

# ==============================================
# FUNÇÕES AUXILIARES DE PROCESSAMENTO DE DADOS
# ==============================================

def extract_id_and_name_from_url(url):
    """Extrai ID e Nome da URL do produto"""
    if not isinstance(url, str):
        return None, "Produto Sem Nome"
    
    try:
        parts = url.split('/p/')
        if len(parts) > 1:
            prod_id = int(parts[1].split('/')[0])
            name_part = parts[0].split('/')[-2] or parts[0].split('/')[-1]
            clean_name = unquote(name_part).replace('-', ' ').strip()
            return prod_id, clean_name
        return None, "Produto Sem Nome"
    except:
        return None, "Erro ao processar URL"

def process_specs(row):
    """Monta dicionário de especificações"""
    specs = {}
    
    mapping = {
        "Tensão (Voltage)": ["Voltage", "Rated voltage", "Operating voltage"],
        "Potência": ["Power", "Rated power", "Output"],
        "Carcaça (Frame)": ["Frame", "Casing"],
        "Frequência": ["Frequency"],
        "Polos": ["Number of Poles", "Number of poles"],
        "Rotação": ["Synchronous speed", "Rated speed", "Rotation"],
        "Proteção": ["Degree of Protection", "Degree of protection", "Protection degree"],
        "Eficiência": ["Efficiency @ 100%", "Efficiency"],
        "Corrente": ["Rated current", "Operating current"],
        "Peso": ["Weight", "Approx. weight"]
    }

    for label, possible_cols in mapping.items():
        for col in possible_cols:
            if col in row and pd.notna(row[col]) and str(row[col]).strip() != '':
                specs[label] = str(row[col])
                break
    
    return specs

def parse_specs(specs_str):
    """Parse especificações"""
    try:
        if pd.isna(specs_str) or specs_str == '':
            return {}
        if isinstance(specs_str, dict):
            return specs_str
        if isinstance(specs_str, str):
            if specs_str.startswith('{') and specs_str.endswith('}'):
                try:
                    return json.loads(specs_str)
                except:
                    try:
                        return json.loads(specs_str.replace("'", '"'))
                    except:
                        return {"descrição": specs_str}
            return {"informação": specs_str}
        return {}
    except Exception as e:
        print(f"Erro ao parsear specs: {e}")
        return {}

def get_column_value(row, column_key):
    """Obtém valor da coluna com fallback"""
    if actual_columns.get(column_key):
        col_name = actual_columns[column_key]
        if col_name in row:
            value = row[col_name]
            return '' if pd.isna(value) else str(value)
    return ''

def extract_category(url):
    """Extrai nome da categoria da URL"""
    try:
        if isinstance(url, str) and '/en/' in url:
            parts = url.split('/en/')
            if len(parts) > 1:
                category_part = parts[1].split('/')[0]
                decoded = unquote(category_part)
                formatted = decoded.replace('-', ' ').title()
                return formatted
        return "Sem Categoria"
    except:
        return "Sem Categoria"

# ==============================================
# CARREGAMENTO DE DADOS DO CSV
# ==============================================

csv_path = r"data/grouped_products_final.csv"

try:
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Arquivo CSV não encontrado em: {csv_path}")
    
    raw_df = pd.read_csv(csv_path, on_bad_lines='skip')
    print(f"Dataset carregado: {len(raw_df)} linhas.")
    
    raw_df = raw_df.fillna('')
    
    column_mapping = {
        'product_name': ['Product Name', 'Product', 'Name', 'product', 'nome'],
        'product_family': ['Product Family', 'Family', 'Familia', 'product_family'],
        'key_features': ['key_features', 'Key Features', 'Features', 'Descrição', 'Description'],
        'main_specs': ['main_specs', 'Main Specs', 'Specifications', 'Especificações'],
        'dimension_specs': ['dimension_specs', 'Dimension Specs', 'Dimensions', 'Dimensões']
    }
    
    def find_column(possible_names):
        for name in possible_names:
            if name in raw_df.columns:
                return name
        return None
    
    for standard_name, possible_names in column_mapping.items():
        actual_column = find_column(possible_names)
        if actual_column:
            actual_columns[standard_name] = actual_column
        else:
            actual_columns[standard_name] = None
    
    df = raw_df.copy()
    
    if 'Product URL' in df.columns:
        df["category_url_segment"] = df["Product URL"].apply(extract_category)
        df["final_category_name"] = df["category_url_segment"]
    else:
        df["final_category_name"] = "Categoria Padrão"
    
    df["product_id"] = (df.index + 1).astype("Int64")
    
    unique_category_names = df["final_category_name"].dropna().drop_duplicates().tolist()
    category_objects = [
        {
            "id": i + 1, 
            "name": name, 
            "photo": f"../src/assets/dummyPhoto{i % 6 + 1}.png", 
            "description": f"Produtos na categoria: {name}", 
            "product_count": 0,
            "status": "Ativo"
        }
        for i, name in enumerate(unique_category_names[:50])
    ]
    
    category_counts = df["final_category_name"].value_counts().to_dict()
    for cat in category_objects:
        cat_name = cat["name"]
        cat["product_count"] = category_counts.get(cat_name, 0)
    
    processed_products = []
    
    for index, row in df.iterrows():
        url = row.get('Product URL', '')
        p_id, p_name = extract_id_and_name_from_url(url)
        
        if not p_id:
            p_id = int(row.get('product_id', index + 100000))
        
        if not p_name or p_name == "Produto Sem Nome":
            p_name = get_column_value(row, 'product_name') or f"Produto {p_id}"
        
        category = row.get("final_category_name", "Sem Categoria")
        key_features = get_column_value(row, 'key_features') or f"Produto {p_id}"
        main_specs = process_specs(row)
        dimension_specs = parse_specs(row.get(actual_columns.get('dimension_specs', ''), {}))
        
        product_obj = {
            "id": p_id,
            "name": p_name,
            "category": category,
            "description": key_features,
            "photo": f"../src/assets/dummyPhoto{int(p_id) % 6 + 1}.png",
            "status": "Ativo",
            "main_specs": main_specs,
            "dimension_specs": dimension_specs,
            "key_features": key_features,
            "url": url,
            "final_category_name": category
        }
        processed_products.append(product_obj)
    
    products_db = processed_products
    categories_db = category_objects
    
    print(f"Processamento concluído: {len(products_db)} produtos, {len(categories_db)} categorias.")
    data_loaded_successfully = True

except FileNotFoundError:
    print(f"ERRO: Arquivo CSV não encontrado. Usando dados dummy.")
    
    raw_df = pd.DataFrame({
        'Product URL': ['https://example.com/en/motores/product1'],
        'Product': ['Motor Exemplo'],
        'Product Family': ['Motores'],
        'Power': ['10kW'],
        'Voltage': ['220V'],
        'Weight': ['100kg'],
        'main_specs': ['{"Potência": "10kW", "Tensão": "220V"}'],
        'dimension_specs': ['{"Altura": "500mm", "Largura": "300mm"}'],
        'key_features': ['Alta eficiência']
    })
    
    actual_columns = {
        'product_name': 'Product',
        'product_family': 'Product Family',
        'key_features': 'key_features',
        'main_specs': 'main_specs',
        'dimension_specs': 'dimension_specs'
    }
    
    df = raw_df.copy()
    df["final_category_name"] = "Motores"
    df["product_id"] = [1]
    
    category_objects = [
        {
            "id": 1, 
            "name": "Motores", 
            "photo": "../src/assets/dummyPhoto1.png", 
            "description": "Produtos na categoria: Motores", 
            "product_count": 1,
            "status": "Ativo"
        }
    ]
    
    products_db = [{
        "id": 1,
        "name": "Motor Exemplo",
        "category": "Motores",
        "description": "Alta eficiência",
        "photo": "../src/assets/dummyPhoto1.png",
        "status": "Ativo",
        "main_specs": {"Potência": "10kW", "Tensão": "220V"},
        "dimension_specs": {"Altura": "500mm", "Largura": "300mm"},
        "key_features": "Alta eficiência",
        "url": "https://example.com/en/motores/product1",
        "final_category_name": "Motores"
    }]
    
    categories_db = category_objects
    data_loaded_successfully = False

# TODO: adapt this to the new backend
#
#

def filter_products_by_role(products: List[Dict], user_role: str, allowed_categories: List[str]):
    """Filtra produtos baseado no role"""
    if user_role == "admin":
        return products
    
    return [product for product in products 
            if product.get("final_category_name") in allowed_categories]

def filter_categories_by_role(categories: List[Dict], user_role: str, allowed_categories: List[str]):
    """Filtra categorias baseado no role"""
    if user_role == "admin":
        return categories
    
    return [category for category in categories 
            if category.get("name") in allowed_categories]

def get_user_categories(user_role: str, user_allowed_categories: List[str] = None):
    """Obtém categorias que o usuário pode acessar"""
    if user_allowed_categories and len(user_allowed_categories) > 0:
        return user_allowed_categories
    return ROLE_CATEGORIES.get(user_role, ROLE_CATEGORIES["guest"])

# ==============================================
# ENDPOINTS PÚBLICOS
# ==============================================

@app.get("/")
def root():
    """Endpoint raiz"""
    return {
        "message": "API de Produtos WEG - FastAPI",
        "status": "online",
        "authentication": "Token JWT do Express/MongoDB",
        "dataset_info": {
            "total_products": len(products_db),
            "total_categories": len(categories_db),
            "data_source": "CSV processado" if data_loaded_successfully else "Dados dummy"
        },
        "note": "Use Authorization: Bearer <token-do-express>"
    }

@app.get("/api/health")
def health_check():
    """Verifica saúde da API"""
    return {
        "status": "healthy",
        "service": "fastapi-product-service",
        "data_load_status": "Success" if data_loaded_successfully else "Warning (Dummy Data)",
        "total_products": len(products_db),
        "total_categories": len(categories_db)
    }

@app.get("/api/handshake")
def handshake():
    """Wake-up endpoint para Render"""
    return {
        "message": "FastAPI Server Woke Up",
        "status": "Data Loaded Successfully" if data_loaded_successfully else "Warning: Dummy Data Used",
        "total_products": len(products_db),
        "total_categories": len(categories_db)
    }

@app.get("/api/public/categories")
async def get_public_categories(limit: int = Query(5, ge=1, le=20)):
    """Endpoint público para categorias"""
    guest_categories = ROLE_CATEGORIES["guest"] # TODO: Adaptar para novo backend 
    public_categories = [cat for cat in categories_db if cat["name"] in guest_categories][:limit]
    
    return {
        "categories": jsonable_encoder(public_categories),
        "total": len(public_categories),
        "note": "Apenas categorias públicas. Faça login para ver mais."
    }

@app.get("/api/public/products")
async def get_public_products(limit: int = Query(5, ge=1, le=20)):
    """Endpoint público para produtos"""
    guest_categories = ROLE_CATEGORIES["guest"] # TODO: Adaptar para novo backend 
    public_products = [p for p in products_db if p.get("final_category_name") in guest_categories][:limit]
    
    return {
        "products": jsonable_encoder(public_products),
        "total": len(public_products),
        "note": "Apenas produtos públicos. Faça login para ver mais."
    }

# ==============================================
# ENDPOINTS PROTEGIDOS
# ==============================================

@app.get("/api/dashboard/stats")
async def get_dashboard_stats(current_user: Dict = Depends(verify_token)): # TODO: Adaptar para novo backend 
    """Estatísticas do dashboard"""
    user_categories = get_user_categories(current_user["role"], current_user.get("allowed_categories", []))
    
    filtered_products = filter_products_by_role(
        products_db, 
        current_user["role"], 
        user_categories
    )
    
    filtered_categories = filter_categories_by_role(
        categories_db,
        current_user["role"],
        user_categories
    )
    
    total_products = len(filtered_products)
    total_categories = len(filtered_categories)
    
    category_counts = {}
    for product in filtered_products:
        cat = product.get("final_category_name", "Sem Categoria")
        category_counts[cat] = category_counts.get(cat, 0) + 1
    
    sorted_categories = sorted(category_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    
    categories_with_products = len([cat for cat in filtered_categories if cat["product_count"] > 0])
    active_percentage = min(100, int((categories_with_products / total_categories) * 100)) if total_categories > 0 else 0
    
    chart_data = {
        "by_category": [
            {"categoria": cat, "valor": count}
            for cat, count in sorted_categories
        ],
        "by_status": [
            {"id": 0, "value": active_percentage, "label": "Ativos"},
            {"id": 1, "value": 10, "label": "Em Revisão"},
            {"id": 2, "value": 5, "label": "Descontinuados"}
        ],
        "weekly_updates": [
            {"day": "Seg", "updates": int(np.random.randint(1, 10))},
            {"day": "Ter", "updates": int(np.random.randint(1, 10))},
            {"day": "Qua", "updates": int(np.random.randint(1, 10))},
            {"day": "Qui", "updates": int(np.random.randint(1, 10))},
            {"day": "Sex", "updates": int(np.random.randint(1, 10))}
        ]
    }
    
    return {
        "total_products": total_products,
        "total_categories": total_categories,
        "active_products_percentage": active_percentage,
        "updates_today": int(np.random.randint(1, 10)),
        "chart_data": chart_data,
        "user_role": current_user["role"],
        "accessible_categories": user_categories
    }

@app.get("/api/categories")
async def get_categories(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    current_user: Dict = Depends(verify_token) # TODO: Adaptar para novo backend 
):
    """Lista categorias com paginação"""
    user_categories = get_user_categories(current_user["role"], current_user.get("allowed_categories", [])) # TODO: Adaptar para novo backend 
    
    filtered_categories = filter_categories_by_role( # TODO: Adaptar para novo backend 
        categories_db,
        current_user["role"],
        user_categories
    )
    
    if search and search.strip():
        search_lower = search.lower().strip()
        filtered_categories = [
            cat for cat in filtered_categories 
            if (search_lower in cat["name"].lower() or 
                search_lower in cat["description"].lower())
        ]
    
    total = len(filtered_categories)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    
    paginated_categories = filtered_categories[start_idx:end_idx]
    
    return {
        "categories": jsonable_encoder(paginated_categories),
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit,
        "user_role": current_user["role"],
        "accessible_categories": user_categories
    }

@app.get("/api/categories/{category_id}")
async def get_category_detail(
    category_id: str,
    current_user: Dict = Depends(verify_token) # TODO: Adaptar para novo backend 
):
    """Detalhes de uma categoria"""
    try:
        cat_id_int = int(category_id)
        category = next((cat for cat in categories_db if cat["id"] == cat_id_int), None)
    except ValueError:
        category = next((cat for cat in categories_db if cat["name"].lower() == category_id.lower()), None)
    
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada!")
    
    user_categories = get_user_categories(current_user["role"], current_user.get("allowed_categories", []))
    
    if (current_user["role"] != "admin" and 
        category["name"] not in user_categories):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Acesso negado à categoria '{category['name']}'"
        )
    
    all_category_products = [p for p in products_db if p["final_category_name"] == category["name"]]
    category_products = filter_products_by_role(
        all_category_products,
        current_user["role"],
        user_categories
    )
    
    limited_products = category_products[:50]
    
    related_categories = [
        {"id": cat["id"], "name": cat["name"], "description": cat["description"], "product_count": cat["product_count"]}
        for cat in categories_db 
        if cat["id"] != category["id"] and 
           (current_user["role"] == "admin" or cat["name"] in user_categories)
    ][:5]
    
    response = {
        "id": category["id"],
        "name": category["name"],
        "description": category["description"],
        "photo": category["photo"],
        "product_count": len(category_products),
        "status": category.get("status", "Ativo"),
        "products": jsonable_encoder(limited_products),
        "related_categories": jsonable_encoder(related_categories),
        "user_has_access": True,
        "user_role": current_user["role"]
    }
    
    return response

@app.get("/api/products")
async def get_products(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    search: Optional[str] = None,
    current_user: Dict = Depends(verify_token) # TODO: Adaptar para novo backend 
):
    """Lista produtos com filtros"""
    user_categories = get_user_categories(current_user["role"], current_user.get("allowed_categories", []))
    
    filtered = filter_products_by_role(
        products_db,
        current_user["role"],
        user_categories
    )
    
    if category and category.strip():
        filtered = [p for p in filtered if p["final_category_name"].lower() == category.strip().lower()]
    
    if search and search.strip():
        search_lower = search.lower().strip()
        filtered = [
            p for p in filtered 
            if (search_lower in p["name"].lower() or 
                search_lower in p["description"].lower() or
                search_lower in p.get("key_features", "").lower())
        ]
    
    total = len(filtered)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    
    paginated_products = filtered[start_idx:end_idx]
    
    return {
        "products": jsonable_encoder(paginated_products),
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total / limit),
        "user_role": current_user["role"],
        "accessible_categories": user_categories
    }

@app.get("/api/products/{product_id}")
async def get_product_detail(
    product_id: int,
    current_user: Dict = Depends(verify_token) # TODO: Adaptar para novo backend 
):
    """Detalhes de um produto"""
    product = next((p for p in products_db if p["id"] == product_id), None)
    
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado!")
    
    user_categories = get_user_categories(current_user["role"], current_user.get("allowed_categories", []))
    
    if (current_user["role"] != "admin" and 
        product["final_category_name"] not in user_categories):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Acesso negado ao produto '{product['name']}'"
        )
    
    all_related_products = [
        p for p in products_db 
        if (p["final_category_name"] == product["final_category_name"] and 
            p["id"] != product["id"])
    ]
    
    related_products = filter_products_by_role(
        all_related_products,
        current_user["role"],
        user_categories
    )[:3]
    
    response = product.copy()
    response["related_products"] = related_products
    response["user_has_access"] = True
    response["user_role"] = current_user["role"]
    
    return jsonable_encoder(response)

@app.get("/api/items")
async def get_items(
    search: Optional[str] = None,
    limit: int = Query(20, ge=1, le=50),
    current_user: Dict = Depends(get_optional_user) # TODO: Adaptar para novo backend 
):
    """Busca geral de items (produtos e categorias)"""
    user_categories = get_user_categories(current_user["role"], current_user.get("allowed_categories", []))
    
    results = {
        "products": [],
        "categories": [],
        "query": search,
        "user_role": current_user["role"]
    }
    
    if search and search.strip():
        search_lower = search.lower().strip()
        
        filtered_products = filter_products_by_role(
            products_db,
            current_user["role"],
            user_categories
        )
        
        product_results = [
            p for p in filtered_products 
            if (search_lower in p["name"].lower() or 
                search_lower in p["description"].lower())
        ][:limit]
        
        for product in product_results:
            results["products"].append({
                "id": product["id"],
                "name": product["name"],
                "description": product["description"],
                "category": product["final_category_name"],
                "type": "product",
                "photo": product["photo"]
            })
        
        filtered_categories = filter_categories_by_role(
            categories_db,
            current_user["role"],
            user_categories
        )
        
        category_results = [
            cat for cat in filtered_categories 
            if (search_lower in cat["name"].lower() or 
                search_lower in cat["description"].lower())
        ][:limit]
        
        for category in category_results:
            results["categories"].append({
                "id": category["id"],
                "name": category["name"],
                "description": category["description"],
                "type": "category",
                "photo": category["photo"],
                "product_count": category["product_count"]
            })
    
    return results

# ==============================================
# OUTROS ENDPOINTS
# ==============================================

@app.get("/api/sample")
async def get_sample_data(
    n: int = Query(5, ge=1, le=100),
    current_user: Dict = Depends(verify_token) # TODO: Adaptar para novo backend 
):
    """Amostra de dados processados"""
    user_categories = get_user_categories(current_user["role"], current_user.get("allowed_categories", []))
    filtered_products = filter_products_by_role(
        products_db,
        current_user["role"],
        user_categories
    )
    sample_data = filtered_products[:n]
    
    return {
        "sample": jsonable_encoder(sample_data),
        "user_role": current_user["role"],
        "total_accessible_products": len(filtered_products)
    }

@app.get("/api/config")
async def get_config():
    """Retorna configuração da API"""
    return {
        "service": "weg-product-api",
        "authentication": "jwt-from-express",
        "jwt_secret": "same-as-express-server",
        "data_status": "loaded" if data_loaded_successfully else "dummy"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)