# Build Stage
FROM node:22 AS build

WORKDIR /app 

COPY package.json package-lock.json ./


RUN npm ci

COPY . .

RUN npm run build

# Production Stage
FROM nginx:stable-alpine

COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
