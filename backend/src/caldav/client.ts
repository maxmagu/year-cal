import { DAVClient } from 'tsdav';
import { config } from '../config.js';

let client: DAVClient | null = null;

async function createClient(): Promise<DAVClient> {
  const c = new DAVClient({
    serverUrl: config.caldavUrl,
    credentials: {
      username: config.appleId,
      password: config.appPassword,
    },
    authMethod: 'Basic',
    defaultAccountType: 'caldav',
  });
  await c.login();
  return c;
}

export async function initClient(): Promise<void> {
  console.log('Initializing CalDAV client...');
  client = await createClient();
  console.log('CalDAV client initialized.');
}

export async function getClient(): Promise<DAVClient> {
  if (!client) {
    client = await createClient();
  }
  return client;
}
