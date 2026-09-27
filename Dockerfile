FROM node:24-alpine AS build
WORKDIR /app
RUN apk add --no-cache font-dejavu
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
COPY public ./public
COPY scripts/prerender.mjs ./scripts/prerender.mjs
COPY scripts/site-url.ts ./scripts/site-url.ts
ARG SITE_URL=http://localhost:8088
ARG PUBLIC_EMAIL=
ARG CV_AVAILABLE=false
ENV VITE_SITE_URL=$SITE_URL VITE_PUBLIC_EMAIL=$PUBLIC_EMAIL VITE_CV_AVAILABLE=$CV_AVAILABLE
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.28-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
HEALTHCHECK --interval=20s --timeout=3s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/health || exit 1
