FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
# Dev server with /api proxy → Express engine; swap for `astro build` + a static
# host with an /api reverse-proxy rule for hardened production serving.
CMD ["npm", "run", "dev"]
