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

| <img loading="lazy" src="https://github.com/BarDeyvid.png" width="115"><br><sub><a href="https://github.com/BarDeyvid">Deyvid Barcelos</a><br><span style="color:#00BFFF">🏗️ Lead Architect</span></sub> | <img loading="lazy" src="https://github.com/luclc13241.png" width="115"><br><sub><a href="https://github.com/luclc13241">Lucas G. S. Nardes</a><br><span style="color:#00BFFF">💻 Desenvolvedor</span></sub> | <img loading="lazy" src="https://github.com/kauamdsouza.png" width="115"><br><sub><a href="https://github.com/kauamdsouza">Kaua M. De Souza</a><br><span style="color:#00BFFF">💻 Desenvolvedor</span></sub> |
| :---: | :---: | :---: |

---

## Overview

InduMine é uma **plataforma full-stack de coleta, organização e visualização de dados industriais**, capaz de:

- **Raspar** catálogos de produtos complexos via Selenium Assíncrono.
- **Processar** e normalizar dados técnicos com **Pandas**.
- **Persistir** dados estruturados em **MySQL** utilizando **SQLAlchemy ORM**.
- **Visualizar** em um dashboard moderno construído com **React + TypeScript + Vite**.

---

## Project Structure

```text
.
├── backend/                # Python API & ETL
│   ├── database/           # SQLAlchemy models & MySQL connection
│   ├── routes/             # API Endpoints
│   ├── services/           # Business logic
│   └── main.py             # FastAPI/Flask entry point
├── etl/                    # Extraction, Transform, Load
│   ├── Miner.py            # Async Selenium scraper (core)
│   ├── Processor.py        # Pandas data cleaning
│   └── loader.py           # SQLAlchemy database ingestion
├── front-end/              # React + TypeScript + Vite Dashboard
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Custom TS hooks
│   │   ├── types/          # TypeScript interfaces/types
│   │   └── App.tsx
│   └── vite.config.ts
├── data/                   # Processed CSV exports
└── README.md

```

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| **Scraping** | Python, Selenium, BeautifulSoup, AsyncIO |
| **ETL** | Pandas, NumPy |
| **ORM** | SQLAlchemy (Python) |
| **Database** | MySQL 8.0 |
| **Frontend** | React 18, **TypeScript**, Vite, Tailwind CSS |
| **DevOps** | GitHub Actions (Leaderboard Automation), `.env` |

---

## How It Works

1. **Miner.py**: Realiza o crawling assíncrono do catálogo e extrai especificações técnicas.
2. **Pandas**: Limpa strings, remove duplicatas e pivota as características técnicas.
3. **SQLAlchemy**: Mapeia os objetos Python para tabelas relacionais no **MySQL**.
4. **React Dashboard**: Consome os dados e exibe em uma interface tipada e performática.

---

## Quick Start

### 1. Clone & Setup

```bash
git clone [https://github.com/BarDeyvid/InduMine.git](https://github.com/BarDeyvid/InduMine.git)
cd InduMine

```

### 2. Environment Setup

Crie um arquivo `.env` com suas credenciais:

```env
DATABASE_URL=mysql+pymysql://user:password@localhost:3306/indumine
JWT_SECRET=your_secret

```

### 3. Frontend (TS + Vite)

```bash
cd front-end
npm install
npm run dev

```
