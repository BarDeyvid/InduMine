FROM python:3.11-slim

WORKDIR /app

# Install system dependencies needed by some Python packages and for downloads
RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
	   libmariadb-dev \
	   gcc \
	   build-essential \
	   ca-certificates \
	   wget \
	&& rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Attempt to install Argos Translate models at image build time
RUN if [ -f scripts/install_argos_models.py ]; then \
	  python scripts/install_argos_models.py || echo "Argos model install failed"; \
	fi

# Expose port used by backend
EXPOSE 8000

# Copy and make startup script executable
RUN chmod +x scripts/wait_and_start.sh

ENTRYPOINT ["/bin/sh", "-c", "backend/scripts/wait_and_start.sh"]