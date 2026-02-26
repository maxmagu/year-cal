import { initClient } from './caldav/client.js';
import { buildServer } from './server.js';
import { config } from './config.js';

async function main() {
  await initClient();
  const app = buildServer();
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`Listening on port ${config.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
