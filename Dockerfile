FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV AGENTFORGE_PORT=3000
EXPOSE 3000

CMD ["node", "--import", "tsx", "src/server.ts"]
