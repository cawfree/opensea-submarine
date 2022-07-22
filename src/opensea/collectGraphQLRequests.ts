import {BrowserContext, HTTPRequest, Page} from 'puppeteer-core';

import {getRequestId, getRequestIds} from './getRequestIds';

export const sniffGraphQLRequests = async ({
  graphQLUri,
  page,
  max,
  timeout,
}: {
  readonly graphQLUri: string;
  readonly page: Page;
  readonly max?: number;
  readonly timeout?: number;
}): Promise<readonly HTTPRequest[]> => {
  const graphQLRequests: HTTPRequest[] = [];
  await new Promise<readonly HTTPRequest[]>(
   (resolve, reject) => {
     if (typeof timeout === 'number') {
       setTimeout(
         () => {
           if (graphQLRequests.length) {
             resolve([...graphQLRequests]);
           } else {
             reject(new Error('Unable to determine GraphQLRequests.'));
           }
         },
         timeout
       );
     }
     page.on('request', (request: HTTPRequest) => {
       if (request.url() !== graphQLUri) return;
       if (request.method() !== 'POST') return;
       graphQLRequests.push(request);
       if (graphQLRequests.length === max) {
         resolve([...graphQLRequests]);
       }
     });
   },
  );

  const requestIds = getRequestIds({graphQLRequests});

  // Prevent duplicates.
  return graphQLRequests.filter(
    (graphQLRequest: HTTPRequest, i: number) => {
      const requestId = getRequestId({graphQLRequest});
      if (requestId === null) return false;
      return requestIds.indexOf(requestId) === i;
    },
  );

};

export const collectGraphQLRequests = async ({
  browserContext,
  graphQLUri,
  uri,
  max,
  timeout,
  //options = {size: 1000, delay: 120},
}: {
  readonly browserContext: BrowserContext;
  readonly graphQLUri: string;
  readonly uri: string;
  readonly max?: number;
  readonly timeout?: number;
  //readonly options?: Options;
}) => {
  const page = await browserContext.newPage();

  await page.setCacheEnabled(false);
  await page.setRequestInterception(true);

  page.on('request', (request) => {
    if (request.resourceType() === 'image') request.abort();
    else request.continue();
  });

  const graphQLRequestsAsync = sniffGraphQLRequests({
    graphQLUri,
    page,
    timeout,
    max,
  });

  await page.goto(uri);

  const graphQLRequests = await Promise.race([
    graphQLRequestsAsync,
    //scrollPageToBottom(page, options),
  ]);

  if (!Array.isArray(graphQLRequests) || !graphQLRequests.length) {
    throw new Error('Was unable to trigger request.');
  }

  return {page, graphQLRequests} as const;
};
