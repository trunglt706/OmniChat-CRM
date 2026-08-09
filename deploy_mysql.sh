cd /var/www/omnichat-crm
npx prisma generate
npx prisma db push --accept-data-loss
npx tsx scripts/seed.ts
npm run build
pm2 reload ecosystem.config.js
