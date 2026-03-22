FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY server/ ./server/
COPY client/ ./client/

RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "server/index.js"]
