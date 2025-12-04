from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
import pandas as pd
from typing import List, Dict, Any, Optional
import json
from urllib.parse import unquote
import numpy as np
import math
import os # Importar para verificar existência do arquivo

app = FastAPI()

# Configurar CORS de forma mais permissiva
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permite todas as origens (para desenvolvimento)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Variáveis globais para armazenar os dados processados
df = pd.DataFrame()
products_db = []
categories_db = []  # Será preenchida com category_objects
actual_columns = {}
category_objects = []  # Para manter compatibilidade com a lógica original
data_loaded_successfully = False # Inicializa a flag

def extract_id_and_name_from_url(url):
    """
    Extrai ID e Nome base da URL do produto WEG.
    Ex: .../W22-WELL-IR3-Premium.../p/13587084
    Retorna: (13587084, 'W22 WELL IR3 Premium...')
    """
    if not isinstance(url, str):
        return None, "Produto Sem Nome"
    
    try:
        # Tentar extrair o ID numérico após '/p/'
        parts = url.split('/p/')
        if len(parts) > 1:
            prod_id = int(parts[1].split('/')[0]) # Pega o ID (ex: 13587084)
            
            # Tentar extrair o nome da parte anterior
            # Ex: .../en///W22-WELL...
            name_part = parts[0].split('/')[-2] # Pega o segmento antes do /p/
            if not name_part: # Caso tenha barras duplas ///
                 name_part = parts[0].split('/')[-1]
            
            clean_name = unquote(name_part).replace('-', ' ').strip()
            return prod_id, clean_name
            
        return None, "Produto Sem Nome"
    except Exception as e:
        return None, "Erro ao processar URL"

def process_specs(row):
    """Monta o dicionário de especificações baseado nas colunas do CSV"""
    specs = {}
    
    # Mapeamento: Chave Desejada -> Coluna no CSV
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
                break # Encontrou, para de procurar p/ essa label
    
    return specs

# Função para parsear especificações (mantida da versão original)
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

# Função para obter valor da coluna com fallback
def get_column_value(row, column_key):
    if actual_columns.get(column_key):
        col_name = actual_columns[column_key]
        if col_name in row:
            value = row[col_name]
            return '' if pd.isna(value) else str(value)
    return ''

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

# Carregar e processar o dataset na inicialização
csv_path = r"data/grouped_products_final.csv"

# --- Bloco de Carregamento de Dados ---
try:
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Arquivo CSV não encontrado em: {csv_path}")

    # Carregar o CSV
    raw_df = pd.read_csv(csv_path, on_bad_lines='skip')
    
    print(f"Dataset carregado: {len(raw_df)} linhas.")
    
    # Preencher valores nulos
    raw_df = raw_df.fillna('')
    
    # Mapeamento de colunas da versão original
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
            if name in raw_df.columns:
                return name
        return None
    
    # Mapear colunas
    for standard_name, possible_names in column_mapping.items():
        actual_column = find_column(possible_names)
        if actual_column:
            actual_columns[standard_name] = actual_column
            print(f"Coluna '{standard_name}' mapeada para '{actual_column}'")
        else:
            actual_columns[standard_name] = None
            print(f"AVISO: Coluna '{standard_name}' não encontrada")
    
    # Manter o DataFrame original para compatibilidade
    df = raw_df.copy()
    
    # Aplicar extração de categoria se a coluna Product URL existir
    if 'Product URL' in df.columns:
        df["category_url_segment"] = df["Product URL"].apply(extract_category)
        df["final_category_name"] = df["category_url_segment"]
    else:
        # Se não houver Product URL, criar categoria padrão
        df["final_category_name"] = "Categoria Padrão"
    
    # Adicionar ID de produto
    df["product_id"] = (df.index + 1).astype("Int64")
    
    # Criar ID numérico para categorias (lógica original)
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
    
    # Calcular contagem de produtos por categoria
    category_counts = df["final_category_name"].value_counts().to_dict()
    for cat in category_objects:
        cat_name = cat["name"]
        cat["product_count"] = category_counts.get(cat_name, 0)
    
    # Processar produtos usando a nova lógica
    processed_products = []
    
    for index, row in df.iterrows():
        # 1. Extrair Identificação da URL
        url = row.get('Product URL', '')
        p_id, p_name = extract_id_and_name_from_url(url)
        
        # Se falhar o ID da URL, usa o product_id do DataFrame
        if not p_id:
            p_id = int(row.get('product_id', index + 100000))
        
        # Fallback para nome se vier vazio da URL
        if not p_name or p_name == "Produto Sem Nome":
            p_name = get_column_value(row, 'product_name') or f"Produto {p_id}"
        
        # 2. Usar categoria extraída da URL (já processada no DataFrame)
        category = row.get("final_category_name", "Sem Categoria")
        
        # 3. Construir Descrição (Features)
        key_features = get_column_value(row, 'key_features') or f"Produto {p_id}"
        
        # 4. Extrair Specs usando a nova lógica
        main_specs = process_specs(row)
        
        # 5. Extrair dimension_specs
        dimension_specs = parse_specs(row.get(actual_columns.get('dimension_specs', ''), {}))
        
        # 6. Criar Objeto Produto
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
            "final_category_name": category  # Mantendo compatibilidade
        }
        processed_products.append(product_obj)
    
    # Ordenar produtos por ID
    products_db = processed_products
    
    # Usar category_objects como categories_db para manter compatibilidade
    categories_db = category_objects
    
    print(f"Processamento concluído: {len(products_db)} produtos, {len(categories_db)} categorias.")
    print(f"Exemplos de categorias: {[cat['name'] for cat in categories_db[:5]]}")
    
    data_loaded_successfully = True # Flag para indicar carregamento OK

except FileNotFoundError:
    print(f"ERRO: Arquivo '{csv_path}' não encontrado. Iniciando com dados dummy.")
    # Dados dummy para não quebrar a API
    raw_df = pd.DataFrame({ # Criar raw_df dummy
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
    
    # Criar dados dummy
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

# --- ENDPOINTS PRINCIPAIS ---

@app.get("/")
def root():
    """Endpoint raiz"""
    return {
        "message": "API do Catálogo de Produtos WEG",
        "status": "online",
        "dataset_info": {
            "total_products": len(products_db),
            "total_categories": len(categories_db),
            "data_source": "Processado a partir do CSV" if data_loaded_successfully else "Dados Dummy (CSV não encontrado)"
        },
        "endpoints": {
            "handshake": "/api/handshake",
            "health": "/api/health",
            "dashboard_stats": "/api/dashboard/stats",
            "categories": "/api/categories",
            "products": "/api/products",
            "search": "/api/search",
            "items": "/api/items"
        }
    }

@app.get("/api/handshake")
def handshake():
    """
    Endpoint de 'Wake-up' para o Render.
    Serve para iniciar o servidor e a carga de dados na primeira chamada.
    """
    status_message = "Data Loaded Successfully" if data_loaded_successfully else "Warning: Dummy Data Used"
    return {
        "message": "Server Woke Up and Handshake Successful",
        "status": status_message,
        "total_products": len(products_db),
        "total_categories": len(categories_db)
    }

@app.get("/api/health")
def health_check():
    """Verifica saúde da API e status do carregamento de dados"""
    return {
        "status": "healthy", 
        "data_load_status": "Success" if data_loaded_successfully else "Warning (Dummy Data Used)",
        "total_products": len(products_db), 
        "total_categories": len(categories_db),
        "actual_columns_mapping": actual_columns
    }

@app.get("/api/dashboard/stats")
def get_dashboard_stats():
    """Retorna estatísticas para o dashboard"""
    
    total_products = len(products_db)
    total_categories = len(categories_db)
    
    # Contar produtos por categoria para gráficos (top 10)
    category_counts = {cat["name"]: cat["product_count"] for cat in categories_db}
    sorted_categories = sorted(category_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    
    # Calcular estatísticas reais
    categories_with_products = len([cat for cat in categories_db if cat["product_count"] > 0])
    # Evitar divisão por zero
    active_percentage = min(100, int((categories_with_products / total_categories) * 100)) if total_categories > 0 else 0
    
    # Dados para gráficos
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
        "chart_data": chart_data
    }

@app.get("/api/categories")
def get_categories(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None
):
    """Retorna categorias com paginação e busca"""
    filtered_categories = categories_db
    
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
        category = next((cat for cat in categories_db if cat["id"] == cat_id_int), None)
    except ValueError:
        # Se não for número, buscar por nome
        category = next((cat for cat in categories_db if cat["name"].lower() == category_id.lower()), None)
    
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada!")
    
    # Buscar produtos desta categoria
    category_products = [p for p in products_db if p["final_category_name"] == category["name"]]
    
    # Limitar a 50 produtos
    limited_products = category_products[:50]
    
    # Buscar categorias relacionadas (outras categorias)
    related_categories = [
        {"id": cat["id"], "name": cat["name"], "description": cat["description"], "product_count": cat["product_count"]}
        for cat in categories_db 
        if cat["id"] != category["id"]
    ][:5]
    
    response = {
        "id": category["id"],
        "name": category["name"],
        "description": category["description"],
        "photo": category["photo"],
        "product_count": category["product_count"],
        "status": category.get("status", "Ativo"),
        "products": jsonable_encoder(limited_products),
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
    filtered = products_db
    
    # Filtro por Categoria
    if category and category.strip():
        filtered = [p for p in filtered if p["final_category_name"].lower() == category.strip().lower()]
    
    # Filtro por Busca
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
        "total_pages": math.ceil(total / limit)
    }

@app.get("/api/products/{product_id}")
def get_product_detail(product_id: int):
    """Retorna detalhes de um produto específico"""
    
    product = next((p for p in products_db if p["id"] == product_id), None)
    
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado!")
    
    # Buscar produtos relacionados (da mesma categoria)
    related_products = [
        p for p in products_db 
        if (p["final_category_name"] == product["final_category_name"] and 
            p["id"] != product["id"])
    ][:3]
    
    # Adicionar produtos relacionados à resposta
    response = product.copy()
    response["related_products"] = related_products
    
    return jsonable_encoder(response)

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
    
    if search and search.strip():
        search_lower = search.lower().strip()
        
        # Buscar produtos
        product_results = [
            p for p in products_db 
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
        
        # Buscar categorias
        category_results = [
            cat for cat in categories_db 
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
    
    search_lower = q.lower()
    
    if type in ["all", "products"]:
        # Buscar produtos
        product_results = [
            p for p in products_db 
            if search_lower in p["name"].lower()
        ][:10]
        
        for product in product_results:
            results["products"].append({
                "id": product["id"],
                "name": product["name"],
                "category": product["final_category_name"],
                "type": "product",
                "photo": product["photo"]
            })
    
    if type in ["all", "categories"]:
        # Buscar categorias
        category_results = [
            cat for cat in categories_db 
            if search_lower in cat["name"].lower()
        ][:10]
        
        for category in category_results:
            results["categories"].append({
                "id": category["id"],
                "name": category["name"],
                "description": category["description"],
                "type": "category",
                "photo": category["photo"]
            })
    
    return results

@app.get("/total_rows")
def get_total_rows():
    """Retorna o número total de produtos"""
    return {"TotalRows": len(products_db)}

@app.get("/api/columns")
def get_columns():
    """Retorna a lista de colunas disponíveis no dataset original"""
    source_df = raw_df if 'raw_df' in globals() and not raw_df.empty else df
    return {
        "columns": list(source_df.columns) if not source_df.empty else [],
        "total_columns": len(source_df.columns) if not source_df.empty else 0,
        "actual_mapping": actual_columns,
        "note": "Os dados da API são processados a partir do CSV original"
    }

@app.get("/api/sample")
def get_sample_data(n: int = Query(5, ge=1, le=100)):
    """Retorna uma amostra dos dados processados"""
    sample_data = products_db[:n]
    return {"sample": jsonable_encoder(sample_data)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)