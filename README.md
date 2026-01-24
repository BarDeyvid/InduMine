# InduMine – Industrial Product Intelligence Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg?logo=react&logoColor=white)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB.svg?logo=python&logoColor=white)](https://www.python.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1.svg?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0-red.svg?logo=python&logoColor=white)](https://www.sqlalchemy.org/)
[![License](https://img.shields.io/badge/license-Apache_2.0-green.svg)](LICENSE)

---

## 📊 Development Metrics
> [!TIP]
> **[Click here to see our Commit Leaderboard (Last 30 days) 🏆](https://github.com/BarDeyvid/InduMine/blob/leaderboard-data/leaderboard.md)**

---

## ⚠️ Disclaimer

**InduMine é um projeto independente, educacional e de código aberto.  
Não é afiliado, endossado ou associado à WEG S.A.**

O scraper coleta **apenas dados técnicos públicos** do catálogo industrial disponível no site da empresa.  
Nenhum dado proprietário, sigiloso, autenticado ou protegido é utilizado.

---

## 👥 Autores

Este projeto atingiu sua arquitetura principal (v1.0) após **mais de 100 commits solo** do fundador, expandindo-se posteriormente para um esforço colaborativo.

| <img loading="lazy" src="https://github.com/BarDeyvid.png" width="115"><br><sub><a href="https://github.com/BarDeyvid">Deyvid Barcelos</a><br><span style="color:#00BFFF">🏗️ Lead Architect</span></sub> | <img loading="lazy" src="https://avatars.githubusercontent.com/u/255575500?v=4" width="115"><br><sub><a href="https://github.com/luclc13241">Lucas G. S. Nardes</a><br><span style="color:#00BFFF">💻 Desenvolvedor</span></sub> | <img loading="lazy" src="https://github.com/kauamdsouza.png" width="115"><br><sub><a href="https://github.com/kauamdsouza">Kaua M. De Souza</a><br><span style="color:#00BFFF">💻 Desenvolvedor</span></sub> |
| :---: | :---: | :---: |

---

## Overview

InduMine é uma **plataforma full-stack de coleta, organização e visualização de dados industriais**, capaz de:

- **Raspar** catálogos de produtos complexos via Selenium Assíncrono.
- **Processar** e normalizar dados técnicos com **Pandas**.
- **Persistir** dados estruturados em **MySQL** utilizando **SQLAlchemy ORM**.
- **Visualizar** em um dashboard moderno construído com **React + TypeScript + Vite**.

---

## 🛠 Tech Stack

| Camada | Tecnologias |
| --- | --- |
| **Data Scraping** | Python, Selenium (Async), BeautifulSoup4 |
| **Backend** | FastAPI, SQLAlchemy ORM, Pydantic |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| **Database** | MySQL 8.0 |
| **DevOps** | Docker, Docker Compose, GitHub Actions |

---

## 📂 Estrutura Atualizada do Projeto

```text
.
├── backend/                # API FastAPI & Modelagem
│   ├── models/             # Tabelas SQLAlchemy (Users, Products)
│   ├── routes/             # Endpoints da API
│   ├── schemas/            # Validação Pydantic
│   └── configuration/      # Mapeamentos e categorias de extração
├── etl/                    # Scripts de Mineração de Dados
│   ├── weg_crawler.py      # Script de crawling específico
│   └── Miner.py            # Core engine de scraping assíncrono
├── front-end/              # Dashboard React + TS
│   ├── src/components/ui/  # Componentes reutilizáveis (shadcn)
│   └── src/App.tsx         # Orquestração da interface
├── docker-compose.yml      # Orquestração de containers
└── .github/workflows/      # CI/CD (GitHub Actions)

```

---

## 🚀 Como Iniciar

### 1. Requisitos

* Docker & Docker Compose **OU**
* Python 3.10+ e Node.js 18+

### 2. Rodando com Docker (Recomendado)

```bash
docker-compose up --build

```

### 3. Setup Manual do Backend

```bash
cd backend
pip install -r requirements.txt
python app.py

```

### 4. Setup Manual do Frontend

```bash
cd front-end
npm install
npm run dev

```

