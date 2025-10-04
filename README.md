# WEG Dashboard - Data Scraping & Analytics

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg?logo=python&logoColor=white)](https://www.python.org/)  
[![React](https://img.shields.io/badge/React-18-61DAFB.svg?logo=react&logoColor=white)](https://reactjs.org/)  
[![Power BI](https://img.shields.io/badge/Power%20BI-Dashboards-F2C811.svg?logo=power-bi&logoColor=white)](https://powerbi.microsoft.com/)  
[![License](https://img.shields.io/badge/license-Apache_2.0-green.svg)](LICENSE)  
[![Git](https://img.shields.io/badge/Git-Version%20Control-orange.svg?logo=git&logoColor=white)](https://git-scm.com/)  

---

## Visão Geral

Este projeto reúne **coleta, tratamento e visualização de dados** para criação de dashboards da **WEG**, utilizando tanto **Power BI** quanto **React (JSX)**, conectados a um **mesmo backend de dados**.

O objetivo é manter **um pipeline único** de dados, facilitando governança e evitando duplicações.

---

## Arquitetura

```mermaid
flowchart TD
    A[Web Scraping / ETL - Python + Pandas] --> B[Banco / Arquivos (CSV, SQL)]
    B --> C[Power BI Relatórios]
    B --> D[React + FastAPI/Flask Dashboard]
````

---

## Estrutura do Repositório

```
├── etl/                # Scripts de scraping e transformação (Python + Pandas)
├── data/               # Dados processados (CSV/Parquet/SQL)
├── dashboards/
│   ├── powerbi/        # Arquivos .pbix e temas (.json)
│   └── react/          # Código do dashboard em React (JSX)
├── requirements.txt    # Dependências Python
└── README.md           # Documentação do projeto
```

---

## Tecnologias Utilizadas

* **Python (Pandas, Requests, BeautifulSoup)** → ETL / Scraping
* **Power BI** → Visualizações rápidas para gestores
* **React (JSX)** → Dashboard web com design avançado
* **FastAPI / Flask** → API de dados (backend para o React)
* **PostgreSQL / CSV / Parquet** → Armazenamento centralizado
* **Git & GitHub** → Controle de versão e colaboração

---

## Funcionalidades

* **Scraping automático** de páginas da web
* **Transformação e limpeza de dados** (ETL) com Pandas
* **Armazenamento centralizado** (CSV/SQL/Parquet)
* **Relatórios no Power BI** para uso interno
* **Dashboard React** com design moderno (dark/blue WEG theme)

---

## Roadmap

* [ ] Automatizar atualização do scraping (cronjob / agendamento)
* [ ] Criar endpoints de API (FastAPI/Flask) para servir dados ao React
* [ ] Refinar design do dashboard React (tema dark/blue WEG)
* [ ] Publicar dashboard React em ambiente interno/nuvem

---

## Contribuindo

Sinta-se à vontade para abrir **[issues](../../issues)** ou enviar **pull requests**.
Toda ajuda é bem-vinda 🚀

---

## Autor

Projeto desenvolvido por **Deyvid**
Entusiasta de Robótica, Engenharia e Dados

[![GitHub](https://img.shields.io/badge/GitHub-Deyvid-black?logo=github)](https://github.com/BarDeyvid)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Deyvid-blue?logo=linkedin\&logoColor=white)](https://www.linkedin.com/in/deyvid-barcelos/)

---

## Licença

Este projeto está sob a licença [Apache 2.0](LICENSE).
