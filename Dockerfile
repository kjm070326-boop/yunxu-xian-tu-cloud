FROM node:24
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
ARG LITESTREAM_VERSION=0.5.18
RUN mkdir -p /tmp/litestream \
  && curl -fsSL "https://github.com/benbjohnson/litestream/releases/download/v${LITESTREAM_VERSION}/litestream-${LITESTREAM_VERSION}-linux-x86_64.tar.gz" -o /tmp/litestream/litestream.tar.gz \
  && tar -xzf /tmp/litestream/litestream.tar.gz -C /tmp/litestream \
  && install /tmp/litestream/litestream /usr/local/bin/litestream
COPY . .
RUN npm run build:client
RUN npx tsc
RUN chmod +x deploy/seed.sh deploy/start.sh
CMD ["./deploy/start.sh"]
