import {ProxyContext, OpenSeaEnvironment} from '../@types';
import {createStealthBrowserContext} from '../puppeteer';
import {collectGraphQLRequests} from '../opensea';

export async function createProxyContext({
  graphQLUri,
  eventHistoryUri: uri,
  privacyUri,
}: OpenSeaEnvironment): Promise<ProxyContext> {
  const {browserContext, close: closeBrowser} = await createStealthBrowserContext({});
  const {graphQLRequests, page} = await collectGraphQLRequests({
    browserContext,
    graphQLUri,
    uri,
    max: 1,
  });

  // HACK: Move to a less resource-intensive page which won't linearly scale memory consumption.
  await page.goto(privacyUri);

  const close = async () => {
    await page.close().catch(console.error);
    await closeBrowser().catch(console.error);
  };
  return {browserContext, graphQLRequests, page, close};
}
