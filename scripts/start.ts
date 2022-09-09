import 'dotenv/config';

import {createServerLoop} from '../src';

const {PORTS = '', DEBUG, HEADLESS} = process.env as Partial<{
  readonly PORTS: string;
  readonly DEBUG: string;
  readonly HEADLESS: string;
}>;

const debug = DEBUG === String(true);
const headless = HEADLESS === String(true);

const ports = PORTS
  .split(',')
  .filter(port => port.length && String(parseInt(port)) === port)
  .map((port) => parseInt(port));

if (!ports.length)
  throw new Error(`Expected non-empty integer array PORTS.`);

// Prevent memory leak warning due to multiple concurrent puppeteer windows.
process.setMaxListeners(ports.length);

void (async () => {
  await Promise.all(
    ports.map((port: number, i: number) => createServerLoop({
      port,
      debug,
      //timeout: ports.length * 60 * 1000 /* 4 minute lifetime */,
      delay: i * 15 * 1000 /* 15s_stipple (init throttle) */,
      graphQLUri: 'https://opensea.io/__api/graphql/',
      eventHistoryUri: 'https://opensea.io/collection/boredapeyachtclub?tab=activity',
      privacyUri: 'https://opensea.io/privacy',
      headless,
    })),
  );
})();
