FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma/
RUN npx prisma generate

COPY src ./src/
COPY tests ./tests/

EXPOSE 5001 1234

CMD ["node", "src/server.js"]

