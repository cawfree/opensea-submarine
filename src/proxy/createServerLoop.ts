import {Server} from 'net';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

import {ProxyContext, OpenSeaEnvironment} from '../@types';

import {proxyMiddleware} from './proxyMiddleware';
import {createProxyContext} from './createProxyContext';

export async function createServerLoop({
  port,
  timeout = null,
  delay,
  debug = false,
  headless,
  ...openSeaEnvironment
}: OpenSeaEnvironment & {
  readonly port: number;
  readonly timeout?: number | null;
  readonly delay: number;
  readonly debug?: boolean;
  readonly headless: boolean;
}) {

  // HACK: Introduce delays around initialization and restarts to avoid
  //       incurring large network overhead.
  await new Promise(resolve => setTimeout(resolve, delay));

  while (true) {

    const servers: Server[] = [];
    const proxyContexts: ProxyContext[] = [];

    try {
      const proxyContext = await createProxyContext({
        ...openSeaEnvironment,
        headless,
      });
      const server = await new Promise<Server>(
        async resolve => {
          const server = express()
            .use(bodyParser.json())
            .use(cors())
            .use(await proxyMiddleware({
              debug,
              proxyContext,
            }))
            .listen(port, () => resolve(server));
        },
      );

      servers.push(server);
      proxyContexts.push(proxyContext);

      await new Promise(
        resolve => timeout !== null
          ? setTimeout(resolve, timeout)
          : undefined
      );

    } catch (e) {
      console.error(e);
    } finally {
      await Promise.all(proxyContexts.map(({close}) => close()));
      servers.map(server => server.close());
    }
  }
}
