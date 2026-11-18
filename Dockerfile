# ---- Stage 1: build the React frontend (CRA + craco) ----
FROM node:22-bullseye AS frontend
WORKDIR /fe
ENV CI=false
COPY frontend/package.json ./
RUN yarn install --ignore-engines --network-timeout 600000
COPY frontend/ ./
RUN yarn build

# ---- Stage 2: Python backend that also serves the built frontend ----
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
      gcc g++ make autoconf automake libtool python3-dev libffi-dev \
    && rm -rf /var/lib/apt/lists/*
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ -r requirements.txt
COPY backend/ ./
COPY --from=frontend /fe/build ./frontend_build
ENV FRONTEND_BUILD_DIR=/app/frontend_build
EXPOSE 8000
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}"]
