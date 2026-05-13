const { PrismaClient } = require('@prisma/client');

function buildDatasourceUrl() {
  const base = process.env.DATABASE_URL;
  if (!base) return undefined;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}connection_limit=5&pool_timeout=20`;
}

const url = buildDatasourceUrl();

const prisma = new PrismaClient(
  url ? { datasources: { db: { url } } } : undefined
);

module.exports = prisma;
