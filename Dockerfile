FROM node:14

WORKDIR /usr/src/app

COPY package*.json ./
COPY frontend/package*.json ./frontend/

RUN npm install
RUN npm --prefix frontend install

COPY . .

RUN npm run build --prefix frontend

EXPOSE 3000
EXPOSE 8080

CMD ["npm", "run", "dev"]
