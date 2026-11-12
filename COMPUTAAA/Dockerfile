# Playwright's image ships Chromium and its system libraries. Keep the tag in step with
# the "playwright" version in package.json.
FROM mcr.microsoft.com/playwright:v1.65.0-noble

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY src ./src
COPY public ./public
COPY scripts ./scripts

ENV NODE_ENV=production HOST=0.0.0.0 DATA_DIR=/data PROFILE_DIR=/data/profile
USER pwuser
CMD ["node", "src/server.js"]
