FROM node:24-bookworm-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205
WORKDIR /opt/baseline
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
ENV HOME=/tmp/home DSH_HOME=/tmp/home/dsh NO_COLOR=1
USER node
WORKDIR /tmp
ENTRYPOINT ["node", "/opt/baseline/node_modules/@deepseek-ai/dsh/lib/bin.js"]
