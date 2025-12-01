from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
import pandas as pd
from typing import List, Dict, Any, Optional
import json
from urllib.parse import unquote
import numpy as np

app = FastAPI()

# Configurar CORS de forma mais permissiva
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permite todas as origens (para desenvolvimento)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Carregar o dataset
try:
    df = pd.read_csv(r"data\\grouped_products_final.csv")
    print(f"Dataset carregado com {len(df)} linhas e {len(df.columns)} colunas")
    print("Colunas disponíveis:", list(df.columns))
    
    # Preencher valores nulos
    df = df.fillna('')
    
    # Renomear colunas para padronizar
    # Verificar se as colunas esperadas existem, caso contrário usar alternativas
    column_mapping = {
        'product_name': ['Product Name', 'Product', 'Name', 'product', 'nome'],
        'product_family': ['Product Family', 'Family', 'Familia', 'product_family'],
        'key_features': ['key_features', 'Key Features', 'Features', 'Descrição', 'Description'],
        'main_specs': ['main_specs', 'Main Specs', 'Specifications', 'Especificações'],
        'dimension_specs': ['dimension_specs', 'Dimension Specs', 'Dimensions', 'Dimensões']
    }
    
    # Função para encontrar coluna correta
    def find_column(possible_names):
        for name in possible_names:
            if name in df.columns:
                return name
        return None
    
    # Mapear colunas
    actual_columns = {}
    for standard_name, possible_names in column_mapping.items():
        actual_column = find_column(possible_names)
        if actual_column:
            actual_columns[standard_name] = actual_column
            print(f"Coluna '{standard_name}' mapeada para '{actual_column}'")
        else:
            actual_columns[standard_name] = None
            print(f"AVISO: Coluna '{standard_name}' não encontrada")
    
except FileNotFoundError:
    print("Arquivo CSV não encontrado. Usando dados de exemplo.")
    df = pd.DataFrame({
        'Product URL': ['https://example.com/en/motores/product1'],
        'Product': ['Motor Exemplo'],  # Note que é 'Product' não 'Product Name'
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

# Função para obter valor da coluna com fallback
def get_column_value(row, column_key):
    if actual_columns.get(column_key):
        col_name = actual_columns[column_key]
        if col_name in row:
            value = row[col_name]
            return '' if pd.isna(value) else str(value)
    return ''

# --- PRÉ-PROCESSAMENTO ---
# Extrair nome da categoria da URL
def extract_category(url):
    try:
        if isinstance(url, str) and '/en/' in url:
            # Extrair segmento após '/en/'
            parts = url.split('/en/')
            if len(parts) > 1:
                category_part = parts[1].split('/')[0]
                # Decodificar URL e formatar
                decoded = unquote(category_part)
                # Substituir hífens por espaços e capitalizar
                formatted = decoded.replace('-', ' ').title()
                return formatted
        return "Sem Categoria"
    except:
        return "Sem Categoria"

# Aplicar extração de categoria se a coluna Product URL existir
if 'Product URL' in df.columns:
    df["category_url_segment"] = df["Product URL"].apply(extract_category)
    df["final_category_name"] = df["category_url_segment"]
else:
    # Se não houver Product URL, criar categoria padrão
    df["final_category_name"] = "Categoria Padrão"

# Adicionar ID numérico para categorias
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
    for i, name in enumerate(unique_category_names[:50])  # Limitar a 50 categorias
]

# Função para parsear especificações
def parse_specs(specs_str):
    try:
        if pd.isna(specs_str) or specs_str == '':
            return {}
        if isinstance(specs_str, dict):
            return specs_str
        if isinstance(specs_str, str):
            # Tentar parsear JSON
            if specs_str.startswith('{') and specs_str.endswith('}'):
                # Tentar várias abordagens para parsear
                try:
                    return json.loads(specs_str)
                except:
                    # Tentar substituir aspas simples por duplas
                    try:
                        return json.loads(specs_str.replace("'", '"'))
                    except:
                        # Se falhar, retornar como string única
                        return {"descrição": specs_str}
            # Se for uma string simples, retornar como dict
            return {"informação": specs_str}
        return {}
    except Exception as e:
        print(f"Erro ao parsear specs: {e}")
        return {}

# Adicionar ID de produto
df["product_id"] = (df.index + 1).astype("Int64")

# Calcular contagem de produtos por categoria
category_counts = df["final_category_name"].value_counts().to_dict()
for cat in category_objects:
    cat_name = cat["name"]
    cat["product_count"] = category_counts.get(cat_name, 0)

# --- ENDPOINTS PRINCIPAIS ---

@app.get("/")
def root():
    """Endpoint raiz"""
    return {
        "message": "API do Catálogo de Produtos WEG",
        "status": "online",
        "dataset_info": {
            "total_products": len(df),
            "total_categories": len(category_objects),
            "columns_sample": list(df.columns)[:20]
        },
        "endpoints": {
            "health": "/api/health",
            "dashboard_stats": "/api/dashboard/stats",
            "categories": "/api/categories",
            "products": "/api/products",
            "search": "/api/search",
            "items": "/api/items"
        }
    }

@app.get("/api/health")
def health_check():
    """Verifica saúde da API"""
    return {
        "status": "healthy", 
        "total_products": len(df), 
        "total_categories": len(category_objects),
        "columns_found": len(df.columns),
        "actual_columns_mapping": actual_columns
    }

@app.get("/api/dashboard/stats")
def get_dashboard_stats():
    """Retorna estatísticas para o dashboard"""
    
    total_products = len(df)
    total_categories = len(category_objects)
    
    # Contar produtos por categoria para gráficos
    category_counts = df["final_category_name"].value_counts().head(10).to_dict()
    
    # Calcular estatísticas reais
    categories_with_products = len([cat for cat in category_objects if cat["product_count"] > 0])
    active_percentage = min(100, int((categories_with_products / total_categories) * 100)) if total_categories > 0 else 0
    
    # Dados para gráficos
    chart_data = {
        "by_category": [
            {"categoria": cat, "valor": count}
            for cat, count in category_counts.items()
        ],
        "by_status": [
            {"id": 0, "value": active_percentage, "label": "Ativos"},
            {"id": 1, "value": 10, "label": "Em Revisão"},
            {"id": 2, "value": 5, "label": "Descontinuados"}
        ],
        "weekly_updates": [
            {"day": "Seg", "updates": np.random.randint(1, 10)},
            {"day": "Ter", "updates": np.random.randint(1, 10)},
            {"day": "Qua", "updates": np.random.randint(1, 10)},
            {"day": "Qui", "updates": np.random.randint(1, 10)},
            {"day": "Sex", "updates": np.random.randint(1, 10)}
        ]
    }
    
    return {
        "total_products": total_products,
        "total_categories": total_categories,
        "active_products_percentage": active_percentage,
        "updates_today": np.random.randint(1, 10),
        "chart_data": chart_data
    }

@app.get("/api/categories")
def get_categories(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None
):
    """Retorna categorias com paginação e busca"""
    filtered_categories = category_objects
    
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
        "total_pages": (total + limit - 1) // limit
    }

@app.get("/api/categories/{category_id}")
def get_category_detail(category_id: str):
    """Retorna detalhes de uma categoria específica"""
    
    # Tentar como ID numérico primeiro
    try:
        cat_id_int = int(category_id)
        category = next((cat for cat in category_objects if cat["id"] == cat_id_int), None)
    except ValueError:
        # Se não for número, buscar por nome
        category = next((cat for cat in category_objects if cat["name"].lower() == category_id.lower()), None)
    
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada!")
    
    # Buscar produtos desta categoria
    category_products = df[df["final_category_name"] == category["name"]].head(50)
    
    products_list = []
    for index, row in category_products.iterrows():
        product_name = get_column_value(row, 'product_name') or f"Produto {row['product_id']}"
        key_features = get_column_value(row, 'key_features') or f"Produto na categoria {category['name']}"
        
        products_list.append({
            "id": int(row["product_id"]),
            "name": product_name,
            "photo": f"../src/assets/dummyPhoto{int(row['product_id']) % 6 + 1}.png",
            "description": key_features,
            "category": category["name"],
            "main_specs": parse_specs(row.get(actual_columns.get('main_specs', ''), {})),
            "dimension_specs": parse_specs(row.get(actual_columns.get('dimension_specs', ''), {})),
            "key_features": key_features,
            "status": "Ativo"
        })
    
    # Buscar categorias relacionadas (outras categorias)
    related_categories = [
        {"id": cat["id"], "name": cat["name"], "description": cat["description"], "product_count": cat["product_count"]}
        for cat in category_objects 
        if cat["id"] != category["id"]
    ][:5]
    
    response = {
        "id": category["id"],
        "name": category["name"],
        "description": category["description"],
        "photo": category["photo"],
        "product_count": category["product_count"],
        "status": category.get("status", "Ativo"),
        "products": jsonable_encoder(products_list),
        "related_categories": jsonable_encoder(related_categories),
        "metadata": {
            "total_products_in_category": len(category_products),
            "sample_size": min(50, len(category_products))
        }
    }
    
    return response

@app.get("/api/products")
def get_products(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    search: Optional[str] = None
):
    """Retorna produtos com filtros"""
    filtered_df = df.copy()
    
    if category and category.strip():
        filtered_df = filtered_df[filtered_df["final_category_name"] == category.strip()]
    
    if search and search.strip():
        search_lower = search.lower().strip()
        
        # Criar máscara de busca em várias colunas possíveis
        search_mask = pd.Series([False] * len(filtered_df))
        
        # Colunas para buscar
        search_columns = []
        if actual_columns.get('product_name'):
            search_columns.append(actual_columns['product_name'])
        if actual_columns.get('key_features'):
            search_columns.append(actual_columns['key_features'])
        if actual_columns.get('product_family'):
            search_columns.append(actual_columns['product_family'])
        
        # Adicionar colunas comuns para busca
        common_search_cols = ['Product', 'Name', 'Descrição', 'Description', 'Features']
        for col in common_search_cols:
            if col in filtered_df.columns:
                search_columns.append(col)
        
        # Aplicar busca em todas as colunas
        for col in set(search_columns):  # Usar set para remover duplicados
            if col in filtered_df.columns:
                col_mask = filtered_df[col].astype(str).str.contains(search_lower, case=False, na=False)
                search_mask = search_mask | col_mask
        
        filtered_df = filtered_df[search_mask]
    
    total = len(filtered_df)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    
    products_list = []
    for index, row in filtered_df.iloc[start_idx:end_idx].iterrows():
        product_name = get_column_value(row, 'product_name') or f"Produto {row['product_id']}"
        key_features = get_column_value(row, 'key_features') or f"Produto {row['product_id']}"
        
        products_list.append({
            "id": int(row["product_id"]),
            "name": product_name,
            "photo": f"../src/assets/dummyPhoto{int(row['product_id']) % 6 + 1}.png",
            "description": key_features,
            "category": row.get("final_category_name", "Sem categoria"),
            "main_specs": parse_specs(row.get(actual_columns.get('main_specs', ''), {})),
            "dimension_specs": parse_specs(row.get(actual_columns.get('dimension_specs', ''), {})),
            "key_features": key_features,
            "status": "Ativo"
        })
    
    return {
        "products": jsonable_encoder(products_list),
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@app.get("/api/products/{product_id}")
def get_product_detail(product_id: int):
    """Retorna detalhes de um produto específico"""
    
    product_data = df[df["product_id"] == product_id]
    
    if product_data.empty:
        raise HTTPException(status_code=404, detail="Produto não encontrado!")
    
    row = product_data.iloc[0]
    
    # Buscar produtos relacionados (da mesma categoria)
    category = row.get("final_category_name", "")
    related_products = df[
        (df["final_category_name"] == category) & 
        (df["product_id"] != product_id)
    ].head(3)
    
    related_list = []
    for _, rel_row in related_products.iterrows():
        rel_product_name = get_column_value(rel_row, 'product_name') or f"Produto {rel_row['product_id']}"
        rel_key_features = get_column_value(rel_row, 'key_features') or f"Produto relacionado na categoria {category}"
        
        related_list.append({
            "id": int(rel_row["product_id"]),
            "name": rel_product_name,
            "description": rel_key_features,
            "photo": f"../src/assets/dummyPhoto{int(rel_row['product_id']) % 6 + 1}.png"
        })
    
    product_name = get_column_value(row, 'product_name') or f"Produto {row['product_id']}"
    key_features = get_column_value(row, 'key_features') or f"Produto {row['product_id']}"
    
    product_detail = {
        "id": int(row["product_id"]),
        "name": product_name,
        "photo": f"../src/assets/dummyPhoto{int(row['product_id']) % 6 + 1}.png",
        "description": key_features,
        "main_specs": parse_specs(row.get(actual_columns.get('main_specs', ''), {})),
        "dimension_specs": parse_specs(row.get(actual_columns.get('dimension_specs', ''), {})),
        "key_features": key_features,
        "category": row.get("final_category_name", ""),
        "status": "Ativo",
        "related_products": jsonable_encoder(related_list),
        "metadata": {
            "category": row.get("final_category_name", ""),
            "product_family": get_column_value(row, 'product_family'),
            "product_url": row.get("Product URL", "") if 'Product URL' in row else ""
        }
    }
    
    return jsonable_encoder(product_detail)

# --- ENDPOINT PARA ITEMS (USADO PELO SEARCHBAR) ---

@app.get("/api/items")
def get_items(
    search: Optional[str] = None,
    limit: int = Query(20, ge=1, le=50)
):
    """
    Endpoint para busca geral de items (produtos e categorias)
    Usado pelo SearchBar
    """
    
    results = {
        "products": [],
        "categories": [],
        "query": search
    }
    
    # Buscar produtos
    if search and search.strip():
        search_lower = search.lower().strip()
        
        # Buscar produtos
        # Criar máscara de busca em várias colunas
        search_mask = pd.Series([False] * len(df))
        
        # Colunas para buscar
        search_columns = []
        if actual_columns.get('product_name'):
            search_columns.append(actual_columns['product_name'])
        if actual_columns.get('key_features'):
            search_columns.append(actual_columns['key_features'])
        if actual_columns.get('product_family'):
            search_columns.append(actual_columns['product_family'])
        
        # Adicionar colunas comuns
        common_search_cols = ['Product', 'Name', 'Descrição', 'Description', 'Features']
        for col in common_search_cols:
            if col in df.columns:
                search_columns.append(col)
        
        # Aplicar busca em todas as colunas
        for col in set(search_columns):
            if col in df.columns:
                col_mask = df[col].astype(str).str.contains(search_lower, case=False, na=False)
                search_mask = search_mask | col_mask
        
        product_results = df[search_mask].head(limit)
        
        for _, row in product_results.iterrows():
            product_name = get_column_value(row, 'product_name') or f"Produto {row['product_id']}"
            key_features = get_column_value(row, 'key_features') or ""
            
            results["products"].append({
                "id": int(row["product_id"]),
                "name": product_name,
                "description": key_features,
                "category": row.get("final_category_name", ""),
                "type": "product",
                "photo": f"../src/assets/dummyPhoto{int(row['product_id']) % 6 + 1}.png"
            })
        
        # Buscar categorias
        for cat in category_objects:
            if (search_lower in cat["name"].lower() or 
                search_lower in cat["description"].lower()):
                results["categories"].append({
                    "id": cat["id"],
                    "name": cat["name"],
                    "description": cat["description"],
                    "type": "category",
                    "photo": cat["photo"],
                    "product_count": cat["product_count"]
                })
    
    return results

@app.get("/api/search")
def search_items(
    q: str = Query(..., min_length=1),
    type: Optional[str] = "all"  # all, categories, products
):
    """Busca em produtos e categorias (endpoint legado)"""
    
    results = {
        "products": [],
        "categories": [],
        "query": q
    }
    
    if type in ["all", "products"]:
        # Buscar produtos
        search_mask = pd.Series([False] * len(df))
        
        # Colunas para buscar
        search_columns = []
        if actual_columns.get('product_name'):
            search_columns.append(actual_columns['product_name'])
        
        # Adicionar colunas comuns
        common_search_cols = ['Product', 'Name']
        for col in common_search_cols:
            if col in df.columns:
                search_columns.append(col)
        
        # Aplicar busca
        for col in set(search_columns):
            if col in df.columns:
                col_mask = df[col].astype(str).str.contains(q, case=False, na=False)
                search_mask = search_mask | col_mask
        
        product_results = df[search_mask].head(10)
        
        for _, row in product_results.iterrows():
            product_name = get_column_value(row, 'product_name') or f"Produto {row['product_id']}"
            
            results["products"].append({
                "id": int(row["product_id"]),
                "name": product_name,
                "category": row.get("final_category_name", ""),
                "type": "product",
                "photo": f"../src/assets/dummyPhoto{int(row['product_id']) % 6 + 1}.png"
            })
    
    if type in ["all", "categories"]:
        # Buscar categorias
        for cat in category_objects:
            if q.lower() in cat["name"].lower() or q.lower() in cat["description"].lower():
                results["categories"].append({
                    "id": cat["id"],
                    "name": cat["name"],
                    "description": cat["description"],
                    "type": "category",
                    "photo": cat["photo"]
                })
    
    return results

# --- ENDPOINT PARA TOTAL DE LINHAS ---

@app.get("/total_rows")
def get_total_rows():
    """Retorna o número total de produtos (linhas) no dataset."""
    return {"TotalRows": len(df)}

# --- ENDPOINT PARA COLUNAS DISPONÍVEIS ---

@app.get("/api/columns")
def get_columns():
    """Retorna a lista de colunas disponíveis no dataset"""
    return {
        "columns": list(df.columns),
        "total_columns": len(df.columns),
        "actual_mapping": actual_columns
    }

# --- ENDPOINT PARA AMOSTRA DE DADOS ---

@app.get("/api/sample")
def get_sample_data(n: int = Query(5, ge=1, le=100)):
    """Retorna uma amostra dos dados"""
    sample_df = df.head(n)
    sample_data = []
    
    for _, row in sample_df.iterrows():
        sample_data.append({
            "id": int(row["product_id"]),
            "name": get_column_value(row, 'product_name'),
            "category": row.get("final_category_name", ""),
            "url": row.get("Product URL", "") if 'Product URL' in row else "",
            "key_features": get_column_value(row, 'key_features')
        })
    
    return {"sample": sample_data}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)