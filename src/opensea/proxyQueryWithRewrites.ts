import {IncomingHttpHeaders} from 'http2';
import {Request} from 'express';
import {HTTPRequest, Page} from 'puppeteer-core';
import gql from 'graphql-tag';

import {proxyRequest, proxyRequestBody} from '../proxy';

import signatures from './signatures.json';

export const proxyQueryWithRewrites = async ({
  headers: defaultHeaders,
  page,
  req,
  templateRequest,
}: {
  readonly headers: IncomingHttpHeaders;
  readonly page: Page;
  readonly req: Request;
  readonly templateRequest: HTTPRequest;
}) => {
  const {
    authorization: Authorization,
    'x-viewer-address': x_viewer_address,
    'x-api-key': x_api_key,
  } = defaultHeaders;
  const headers = templateRequest.headers();
  const url = templateRequest.url();

  const {body: reqBody} = req;
  const {operationName: _, ...body} = reqBody;
  const {query} = body;

  const {definitions} = gql`
    ${query}
  `;

  const operationDefinitions = definitions
    .filter((e) => e.kind === 'OperationDefinition')

  if (operationDefinitions.length > 1) throw new Error('Batch queries are not yet supported.');

  const [maybeOperationDefinition] = definitions;

  if (maybeOperationDefinition.kind !== 'OperationDefinition')
    throw new Error(`Expected OperationDefinition, encountered "${maybeOperationDefinition.kind}".`);

  const operationName = maybeOperationDefinition.name.value;

  if (!Object.keys(signatures).includes(operationName))
    throw new Error(`"${operationName}" is not a recognized query type!`);

  // @ts-ignore
  const x_signed_query: string = signatures[operationName];

  const nextHeaders = {
    ...headers,
    ...(Authorization ? {Authorization} : {}),
    ...(x_viewer_address ? {'x-viewer-address': x_viewer_address} : {}),
    ...(x_api_key ? {'x-api-key': x_api_key} : {}) /* not_necessary */,
    'x-signed-query': x_signed_query,
  };

  const args = proxyRequestBody({
    body: JSON.stringify({...body, operationName}),
    url,
    headers: nextHeaders,
    method: 'post',
  });

  const {
    text,
    headers: responseHeaders,
  } = await proxyRequest({page, args});

  try {
    return {
      result: JSON.parse(text),
      headers: responseHeaders,
    };
  } catch (e) {
    throw new Error(text);
  }
}
