// front-end/src/products/ProductDetail.jsx
import React from 'react';
import { useParams } from 'react-router-dom'; 
import styled from 'styled-components';
import Header from "../components/Header";

const DUMMY_PRODUCTS = [
    { 
        id: 1, 
        name: "Produto 1", 
        photo: "../src/assets/dummyPhoto1.png", 
        main_specs: {
            "Potência": "75kW", 
            "Frequência": "60Hz", 
            "Polos": "4", 
            "Tensão": "380-440V", 
            "Rotação": "1800rpm", 
            "Rendimento": "IE3 Premium",
        },
        dimension_specs: {
            "Altura": "600mm",
            "Largura": "300mm",
            "Profundidade": "400mm",
            "Peso": "270kg"
        },
        description: "Descrição detalhada do Produto 1. Um motor de alta potência e eficiência." 
    },
    { 
        id: 2, 
        name: "Produto 2", 
        photo: "../src/assets/dummyPhoto2.png", 
        main_specs: {
            "Potência": "1.5kW", 
            "Frequência": "50/60Hz", 
            "Tensão de Entrada": "220V Monofásico", 
            "Controle": "Vetor/V/F", 
            "Proteção": "IP20"
        }, 
        dimension_specs: {
            "Altura": "150mm",
            "Largura": "80mm",
            "Profundidade": "120mm",
            "Peso": "2.5kg"
        },
        description: "Descrição detalhada do Produto 2. Inversor de frequência inteligente e compacto." 
    },
    { 
        id: 3, 
        name: "Produto 3", 
        photo: "../src/assets/dummyPhoto3.png", 
        main_specs: {
            "Potência Nominal": "10kVA", 
            "Combustível": "Diesel", 
            "Nível de Ruído": "70 dB @ 7m", 
            "Partida": "Elétrica"
        }, 
        dimension_specs: {
            "Comprimento": "1200mm",
            "Largura": "600mm",
            "Altura": "800mm",
            "Peso": "180kg"
        },
        description: "Descrição detalhada do Produto 3. Gerador confiável para aplicações críticas." 
    },
    { id: 4, name: "Produto 4", photo: "../src/assets/dummyPhoto4.png", main_specs: {"Tipo": "Transformador de Força", "Classe de Isolamento": "F"}, dimension_specs: {}, description: "Descrição detalhada do Produto 4. Transformador de energia de baixo ruído." },
    { id: 5, name: "Produto 5", photo: "../src/assets/dummyPhoto5.png", main_specs: {"Proteção": "IP65", "Fases": "Trifásico"}, dimension_specs: {}, description: "Descrição detalhada do Produto 5. Motor trifásico com proteção IP65." },
    { id: 6, name: "Produto 6", photo: "../src/assets/dummyPhoto6.png", main_specs: {"Aplicação": "Solar Fotovoltaico", "MPPT": "Duplo"}, dimension_specs: {}, description: "Descrição detalhada do Produto 6. Inversor solar para sistemas fotovoltaicos." },
    { id: 7, name: "Produto 7", photo: "../src/assets/dummyPhoto7.png", main_specs: {"Potência": "5kVA", "Portabilidade": "Sim"}, dimension_specs: {}, description: "Descrição detalhada do Produto 7. Gerador portátil a diesel." },
    { id: 8, name: "Produto 8", photo: "../src/assets/dummyPhoto8.png", main_specs: {"Isolamento": "Elétrico", "Uso": "Segurança"}, dimension_specs: {}, description: "Descrição detalhada do Produto 8. Transformador de isolamento para segurança." },
    { id: 9, name: "Produto 9", photo: "../src/assets/dummyPhoto9.png", main_specs: {"Tipo": "Motor de Passo", "Precisão": "Alta"}, dimension_specs: {}, description: "Descrição detalhada do Produto 9. Motor de passo para automação precisa." },
    { id: 10, name: "Produto 10", photo: "../src/assets/dummyPhoto10.png", main_specs: {"Tensão": "Alta", "Indústria": "Pesada"}, dimension_specs: {}, description: "Descrição detalhada do Produto 10. Inversor de alta tensão para indústria pesada." },
];

const DetailWrapper = styled.div`
    background-color: ${props => props.theme.surface}; 
    color: ${props => props.theme.text}; 
    width: 100%;
    min-height: 100vh;
    box-sizing: border-box;
    display: flex; 
    flex-direction: column;

  hr {
        border-color: ${props => props.theme.textSecondary};
        opacity: 0.5;
        }

        ul {
            list-style: none;
            margin: 0;         
            padding: 0;         
            flex-direction: row;
            display: flex;
            gap: 5vw;           
            width: auto;
            justify-content: center; 
        }

        li {
            margin: 0;          
            padding: 2vw;           
            text-align: center; 
            border: 1px solid ${props => props.theme.textSecondary};
            border-radius: 16px;
            width: auto;
            height: auto;
        }
        
        li:hover {
            box-shadow: 0 4px 8px ${props => props.theme.primary};
            transform: translateY(-2px);
            transition: all 0.3s ease;
        }

        h3 {
            margin: 0;
            color: ${props => props.theme.primary};
        }
        h2 {
            margin: 0;
            color: ${props => props.theme.textSecondary};
        }

        .ChartContainer > ul { 
            gap: 2vw; 
        }

        .ChartContainer > ul > li {
            padding: 1vw;
            flex-grow: 1; 
            flex-basis: 0; 
            min-width: 0; 
            max-width: 33%; 
        }
        
        .products.grid ul {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px; 
            padding: 0;
            margin: 0;
        }
        
        .products.grid ul li {
            display: flex;                
            flex-direction: column;
            align-items: center;          
            justify-content: center; 
            padding: 1rem;
            }

            .products.grid ul li img {
            width: 100px;                 
            height: auto;
            margin: 0 0 10px 0; 
            border-radius: 8px;           
            }

            .products.grid ul li span {
            text-align: center;
            font-weight: bold;
            }

        .products.list ul {
            display: flex;
            flex-direction: column; 
            gap: 8px;
            padding: 0;
            margin: 0;
        }

        .products.list ul li {
            display: flex; 
            align-items: center;
            text-align: left;
            padding: 1rem;
            width: 100%;
            box-sizing: border-box;
        }

        .products.list ul li img {
            width: 60px;          
            height: auto;
            margin-right: 20px; 
            border-radius: 8px;
        }

        sides {
            display: flex;
            gap: 5vw;
            margin-top: 20px;
            flex-direction: row;
            }

        .products-header {
            display: flex;
            justify-content: space-between; 
            align-items: center; 
            padding: 0 20px;
            margin-bottom: 20px;
        }

        .list-info {
            flex: 1; 
            text-align: left;
        }

        .list-info h3, .list-info p {
            margin: 0;
        }

        .list-info p {
            font-size: 0.9em;
            color: ${props => props.theme.textSecondary};
        }
        
        .toggle-button {
            padding: 8px 12px;
            background-color: ${props => props.theme.primary};
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.3s;
        }

        .toggle-button:hover {
            background-color: ${props => props.theme.primary};
        }
        
        .Right-Div {
            display: flex;
            gap: 20px;
            background-color: ${props => props.theme.background};
            border-radius: 8px;
            padding: 20px;
            align-items: center;
            height: fit-content;
            flex-direction: column;
        } 
        
        .specs-list {
            list-style: none;
            padding: 0;
            margin: 0;
            width: 100%;
        }
        
        .specs-list li {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px solid ${props => props.theme.textSecondary}33; 
            font-size: 1em;
            width: 100%;
            text-align: left;
        }
        
        .specs-list li:hover {
            box-shadow: none; 
            transform: none; 
            transition: none;
        }

        .specs-list li:last-child {
            border-bottom: none;
        }

        .specs-list strong {
            color: ${props => props.theme.text};
            font-weight: bold;
            margin-right: 10px;
        }
        .specs-list span {
            color: ${props => props.theme.textSecondary};
            text-align: right;
        }

        .specs-section h3 {
            color: ${props => props.theme.primary};
            border-bottom: 2px solid ${props => props.theme.primary};
            padding-bottom: 5px;
            margin-top: 15px;
            margin-bottom: 10px;
        }


`;

const SpecsList = ({ specs, title }) => {
    const specsArray = Object.entries(specs);
    if (specsArray.length === 0) {
        return null;
    }

    return (
        <div className='specs-section'>
            <h3>{title}</h3>
            <ul className='specs-list'>
                {specsArray.map(([key, value]) => (
                    <li key={key}>
                        <strong>{key}:</strong> 
                        <span>{value}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

function ProductDetail() {
    const { productId } = useParams(); 
    const numericProductId = parseInt(productId);

    const product = DUMMY_PRODUCTS.find(p => p.id === numericProductId);

    if (!product) {
        return <DetailWrapper><Header /><h1>Produto não encontrado!</h1></DetailWrapper>;
    }

    return (
        <DetailWrapper>
            <Header />
                <sides>
                <photoArea>
                    <h1>Detalhes do Produto: {product.name}</h1>
                    <img src={product.photo} alt={product.name} style={{ width: '200px', borderRadius: '8px' }}/>
                </photoArea>
                
                <div className='Right-Div'>
                    <section>
                        <h2>Descrição Geral</h2>
                        <p>{product.description}</p>
                    </section>
                    
                    <section>
                        <h2>Especificações Técnicas</h2>
                        
                        <SpecsList 
                            specs={product.main_specs || {}} 
                            title="Características" 
                        />

                        <SpecsList 
                            specs={product.dimension_specs || {}} 
                            title="Dimensões e Peso" 
                        />

                        {Object.keys(product.main_specs).length === 0 && 
                         Object.keys(product.dimension_specs).length === 0 && (
                            <p>Nenhuma especificação técnica disponível.</p>
                        )}
                        
                    </section>
                </div>
            </sides>
        </DetailWrapper>
    );
}

export default ProductDetail;