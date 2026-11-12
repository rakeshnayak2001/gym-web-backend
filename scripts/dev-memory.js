// Run the API against a throwaway in-memory MongoDB — no database setup needed.
//   npm run dev:memory
import { MongoMemoryServer } from 'mongodb-memory-server';

const mongo = await MongoMemoryServer.create();
process.env.MONGO_URI = mongo.getUri('kinetiq');
process.env.JWT_SECRET ||= 'dev-only-secret-change-me';
console.log('✓ In-memory MongoDB started (data is discarded on exit)');

const stop = async () => {
  await mongo.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

await import('../src/server.js');
