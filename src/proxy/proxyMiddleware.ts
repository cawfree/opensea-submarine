import chalk from 'chalk';
import express, {Request, Response, Express, NextFunction} from 'express';
import bodyParser from 'body-parser';
import {HTTPRequest, Page} from 'puppeteer-core';

import {ProxyContext} from '../@types';
import {proxyQueryWithRewrites} from '../opensea';

import {proxyRequest, proxyRequestBody} from './proxyRequest';

const maybeParseThrottleErrorMessageMillis = (message: string) => {
  const pfx = 'Error: Too many requests. Please wait ';
  const sfx = ' microseconds.';

  if (!message.startsWith(pfx) || !message.endsWith(sfx)) return null;

  const microsecondsString = message.substring(
    pfx.length,
    message.length - sfx.length,
  );

  const microseconds = parseInt(microsecondsString);

  if (String(microseconds) !== microsecondsString) throw new Error(`Failed to parse microsecondsString, "${
    microsecondsString
  }".`);

  return microseconds / 1000;
};

const openseaGraphQLProxy = ({debug, page, templateRequest}: {
  readonly debug: boolean;
  readonly page: Page;
  readonly templateRequest: HTTPRequest;
}) => async (req: Request, res: Response) => {
  try {
    const {headers} = req;
    const {
      result,
      headers: responseHeaders,
    } = await proxyQueryWithRewrites({
      headers,
      page,
      req,
      templateRequest,
    });

    if ('errors' in result) {
      const {errors} = result;
      if (Array.isArray(errors) && errors.length) throw result;
    }

    if (responseHeaders && typeof responseHeaders === 'object') {
      Object.entries(responseHeaders)
        .forEach(([k, v]) => res.setHeader(k, v));
    }


    console.log('about to res.send', !!res, !!res?.send);

    res?.status(200);
    res?.send(result);

   // return res
   //   .status(200)
   //   .send(result);
  } catch (e) {

    const maybeMessage = String(e);

    const message = maybeMessage === String({})
      ? JSON.stringify(maybeMessage)
      : maybeMessage;

    const maybeThrottleRequestMillis = maybeParseThrottleErrorMessageMillis(message);

    // Error: Too many requests. Please wait 437754 microseconds.
    if (typeof maybeThrottleRequestMillis === 'number') {
      // Inform the requester they should retry this request in the coming seconds.
      return res
        .status(200)
        .setHeader('retry-after', Math.ceil(maybeThrottleRequestMillis / 1000))
        .send({data: null});
    }

    if (debug) {
      console.log(chalk.red`${message}`, JSON.stringify(req.body));
    }

    return res
      .status(500)
      .send({
        data: null,
        errors: [{
          message,
          extensions: {
            code: 'GRAPHQL_VALIDATION_FAILED',
          }
        }],
      });
  }
};

const openSeaHttpProxy = ({debug, page}: {
  readonly debug: boolean;
  readonly page: Page;
}) => async (req: Request, res: Response, next: NextFunction) => {
  const {method} = req;
  if (method !== 'GET') return next();

  const {originalUrl: uri} = req;
  const url = `https://opensea.io${uri}`;
  const args = proxyRequestBody({
    url,
    method,
  });

  try {
    if (debug) console.log(chalk.green`${url}`);
    const text = await proxyRequest({page, args});
    return res.status(200).send(text);
  } catch (e) {
    if (debug) console.log(chalk.red`${String(e)}`);
    return res
      .status(500)
      .send(String(e));
  }
};

export const proxyMiddleware = async ({
  debug = false,
  proxyContext,
}: {
  readonly debug?: boolean;
  readonly proxyContext: ProxyContext;
}): Promise<Express> => {
  const {graphQLRequests, page} = proxyContext;

  const [templateRequest] = graphQLRequests;

  if (!templateRequest) throw new Error(`Unable to find templateRequest.`);

  return express()
    .post('/graphql', openseaGraphQLProxy({
      debug,
      page,
      templateRequest,
    }))
    .use('*', openSeaHttpProxy({debug, page}));
}
