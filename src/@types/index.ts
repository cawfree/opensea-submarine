import {BrowserContext, Page, HTTPRequest} from 'puppeteer-core';

export type ProxyContext = {
  readonly browserContext: BrowserContext;
  readonly page: Page;
  readonly graphQLRequests: readonly HTTPRequest[];
  readonly close: () => Promise<void>;
};

export type OpenSeaEnvironment = {
  readonly graphQLUri: string;
  readonly eventHistoryUri: string;
  readonly privacyUri: string;
};
