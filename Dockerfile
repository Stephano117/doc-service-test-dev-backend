FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm install -D typescript && npx tsc

# Copie le swagger.yaml dans dist
RUN cp swagger.yaml dist/swagger.yaml

EXPOSE 3000

CMD ["node", "dist/src/server.js"]