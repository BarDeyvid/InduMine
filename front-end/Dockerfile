# Estágio 1: Build
FROM node:20-alpine AS build
WORKDIR /app

# Instalar dependências necessárias para compilação (se necessário)
RUN apk add --no-cache libc6-compat

COPY package*.json ./

# Instala as dependências ignorando scripts e depois reconstrói especificamente o esbuild
RUN npm ci --prefer-offline --no-audit
RUN npm rebuild esbuild

COPY . .

# Argumentos de build
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Estágio 2: Servir com Nginx
FROM nginx:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]