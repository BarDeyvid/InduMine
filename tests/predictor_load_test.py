import joblib
import pandas as pd

modelo = joblib.load(r'predict/weg_categoria_predictor_v1.pkl')
features_cols = joblib.load(r'predict/weg_features_list.pkl')

dados = {
    'Function': 'Varnish',
    'Type': '',
    'RESIN SYSTEM': '',
    'Product family': '',
    'PAINT FUNCTION': '',
    'PAINT PRODUCTS LINE': '',
    'Shine': 'Bright',
    'Color': '',
    'PACKAGING': '',
    'Application': '',
    'Product URL': 'https://www.weg.net/.../CLEARCOAT-UHT-W-60/...'
}

linha = pd.DataFrame([dados])

linha = linha.fillna('missing')

encoded = pd.get_dummies(linha.reindex(columns=features_cols, fill_value='missing'))

final = encoded.reindex(columns=modelo.feature_names_in_, fill_value=0)

pred = modelo.predict(final)[0]
prob = modelo.predict_proba(final)[0]
confianca = max(prob)

print(f"Categoria prevista: {pred} (confiança: {confianca:.3f})")
