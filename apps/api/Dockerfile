# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @edb/shared build
RUN pnpm --filter @edb/api exec prisma generate
# Stash the generated Prisma client at a stable path for the runtime stage
RUN cp -r "$(find /repo/node_modules/.pnpm -path '*/@prisma+client*/node_modules/.prisma' -type d | head -1)" /prisma-generated
RUN pnpm --filter @edb/api build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

COPY --from=build /repo/pnpm-workspace.yaml /repo/pnpm-lock.yaml /repo/package.json ./
COPY --from=build /repo/apps/api/package.json apps/api/
COPY --from=build /repo/packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --prod

# Inject the generated Prisma client into the pnpm virtual store
COPY --from=build /prisma-generated /prisma-generated
RUN dest="$(find /app/node_modules/.pnpm -maxdepth 2 -path '*/@prisma+client*/node_modules' -type d | head -1)" && \
    mkdir -p "$dest/.prisma" && \
    cp -r /prisma-generated/. "$dest/.prisma/" && \
    rm -rf /prisma-generated

COPY --from=build /repo/packages/shared/dist packages/shared/dist
COPY --from=build /repo/apps/api/dist apps/api/dist
COPY --from=build /repo/apps/api/prisma apps/api/prisma

EXPOSE 3000
WORKDIR /app/apps/api
CMD ["sh", "-c", "pnpm prisma:deploy && pnpm prisma:seed && node dist/main.js"]
