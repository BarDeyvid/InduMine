FROM python:3.11-slim

WORKDIR /app

# Instala dependências do sistema se necessário
RUN apt-get update && apt-get install -y libmariadb-dev gcc

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Porta que o seu backend usa
EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]