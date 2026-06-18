const { eq } = require('drizzle-orm');
const { favoritesTable } = require('./lib/db/dist/index.js'); // using built library

try {
  const cond = eq(favoritesTable.trackId, 'test-id');
  console.log('Condition keys:', Object.keys(cond));
  console.log('Condition JSON:', JSON.stringify(cond));
  console.log('Condition Details:', cond);
} catch (e) {
  console.error(e);
}
