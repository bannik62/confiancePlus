# Build statique pour déploiement Apache en prod
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Le dossier dist/ est à copier dans le DocumentRoot Apache
FROM alpine
COPY --from=builder /app/dist /dist
