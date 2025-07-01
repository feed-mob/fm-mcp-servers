FROM node:20-alpine

WORKDIR /app

COPY . .

RUN npm ci && npm run build

EXPOSE 3002

CMD ["node", "dist/index.js"]
