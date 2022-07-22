import {JSONObject, Page, SerializableOrJSHandle} from 'puppeteer-core';

export const proxyRequestBody = ({method, url, body, headers = {}}: {
  readonly method: string;
  readonly url: string;
  readonly body?: Record<string, unknown> | string;
  readonly headers?: Record<string, string | string[]>;
}) => ({
  method,
  url,
  headers,
  body,
} as JSONObject);

export function proxyRequest({page, args}: {
  readonly page: Page;
  readonly args: SerializableOrJSHandle;
}) {
  return page.evaluate(
    async ({body, url, headers, method}) => {
      const response = await fetch(url, {headers, body, method});
      const text = await response.text();
      return {
        text,
        headers: Object.fromEntries(
          // Propagate flags of interest.
          ['retry-after']
            .filter(k => response.headers.get(k) ?? false)
            .map(k => [k, response.headers.get(k)]),
        ),
      };
    },
    args,
  );
}
