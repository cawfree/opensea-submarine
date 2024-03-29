> ⚠️ This repository is __deprecated__.
>
> The technique of __Same-Origin-Resource-Crossing__, which this repository demonstrated can be used to attain access to closed-off APIs, has been generalized in [`@cawfree/sameorigin`](https://github.com/cawfree/sameorigin).

# opensea-submarine

[watch me breakdown](https://twitter.com/cawfree/status/1550505696747307013)

[__OpenSea__](https://opensea.io) is the world's foremost NFT marketplace which takes great care to protect its API from abuse by [__ETH__](https://ethereum.org/en/)-hungry robots who are desperate to discover profit opportunities the fastest.

OpenSea makes this task difficult in a number of ways:
  - Any request to the backend must be precisely-defined to satisfy strong [__CloudFlare__](https://www.cloudflare.com/en-gb/) protection.
  - Robust client-side session management and adherence imposes additional complexity during request formation which dramatically complicates attempts to programmatically `fetch` the API.
  - The backend enforces that the structure of an individual request must resolve to a known checksum.

If that wasn't enough, the successfully returned contents of pages rendered by OpenSea's [__SPA__](https://en.wikipedia.org/wiki/Single-page_application) are highly obfuscated to make the task of [_manual scraping_](https://github.com/cawfree/opensea-floor-looks-rare) slow, unreliable and limited in scalability.

By using a [_stealthy_](https://www.npmjs.com/package/puppeteer-extra-plugin-stealth) flavour of [__Puppeteer__](https://developer.chrome.com/docs/puppeteer/), this repository demonstrates that a user can __hijack__ client-side [GraphQL](https://graphql.org/) requests and repurpose them for custom queries. This enables the client to squat on the complex trusted setup and abstract away request complexity.

## 🚀 getting started

Using [__Yarn__](https://yarnpkg.com/):

```bash
yarn add opensea-submarine
```

## ✏️ usage

This package exports an [__Express__](https://github.com/expressjs/express) middleware which emulates a conventional GraphQL interface. GraphQL requests captured by the middleware are validated, sanitized and curried over into OpenSea's backend via request-squatting:

```typescript
import cors from 'cors';
import express from 'express';
import axios from 'axios';

import {proxyMiddleware} from 'opensea-submarine';

const openSeaEnvironment = {
  graphQLUri: 'https://opensea.io/__api/graphql/',
  eventHistoryUri: 'https://opensea.io/collection/boredapeyachtclub?tab=activity',
  privacyUri: 'https://opensea.io/privacy',
};

const proxyContext = await createProxyContext(openSeaEnvironment);

const server = await new Promise<Server>(
  async resolve => {
    const server = express()
      .use(cors())
      .use(await proxyMiddleware({
        debug: true,
        proxyContext,
      }))
      .listen(3000, () => resolve(server));
  },
);
```

Then you're free to query the middleware using queries that are recognized by OpenSea:

```typescript
import axios from 'axios';

const {data} = await axios({
  url: 'http://localhost:3000/graphql',
  method: 'post',
  data: {"query":"query useIsEditableQuery(\n  $collection: CollectionSlug!\n) {\n  collection(collection: $collection) {\n    isEditable\n    id\n  }\n}\n","variables":{"collection": "boredapeyachtclub"}},
});

// {"collection":{"isEditable":false,"id":"Q29sbGVjdGlvblR5cGU6NDg4NjIx"}}
```

You can check out the [__examples__](./scripts/start.ts) for additional insight.

Developers are reminded that the query content and `x-signed-query` header must be __identical__ to real `graphql/` requests sourced from OpenSea, which can be found in your browser's __Networking__ tab.

By contrast, request `variables` are permitted to change freely.

## ✌️ license
[__MIT__](./LICENSE)
