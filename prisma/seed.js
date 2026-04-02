const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/** Stable public pages you can open in the browser; skipped if URL already exists. */
const defaultWebsites = [
  { name: 'Example Domain', url: 'https://example.com' },
  { name: 'W3C', url: 'https://www.w3.org/' },
  { name: 'MDN Web Docs', url: 'https://developer.mozilla.org/' },
];

async function main() {
  for (const row of defaultWebsites) {
    const existing = await prisma.website.findFirst({ where: { url: row.url } });
    if (!existing) {
      await prisma.website.create({ data: row });
      console.log(`Seeded website: ${row.name} (${row.url})`);
    } else {
      console.log(`Skipped (already exists): ${row.url}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
