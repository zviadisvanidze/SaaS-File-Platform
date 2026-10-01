const { MongoMemoryServer } = require('mongodb-memory-server');

async function main() {
  const mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.PORT = process.env.PORT || '3001';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-smoke-test-secret';
  process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
  process.env.NODE_ENV = 'development';

  // eslint-disable-next-line no-console
  console.log(`[dev-with-memory-db] in-memory MongoDB at ${process.env.MONGODB_URI}`);

  require('../dist/main.js');
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[dev-with-memory-db] failed to start', error);
  process.exit(1);
});
