# ── Stage 1: Build React frontend ────────────────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

# Install JS dependencies
COPY frontend/package*.json ./
RUN npm ci

# Copy source and build
COPY frontend/ ./
RUN npm run build
# Output goes to /app/public (outDir: '../public' in vite.config.js)


# ── Stage 2: FastAPI backend ─────────────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source
COPY backend/ ./backend/

# Copy built React bundle from stage 1
COPY --from=frontend-build /app/public ./public

# Copy data files and env
COPY data/ ./data/
COPY .env ./.env

# Expose Cloud Run port
EXPOSE 8080

# Run FastAPI via uvicorn
CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
