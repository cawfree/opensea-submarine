import {HTTPRequest} from 'puppeteer-core';

export const getRequestId = ({graphQLRequest}: {
  readonly graphQLRequest: HTTPRequest;
}): string | null => {
  try {
    const {id: qid} = JSON.parse(graphQLRequest.postData());
    if (typeof qid === 'string') {
      return qid;
    }
  } catch (e) {/**/}
  return null;
};

export const getRequestIds = ({graphQLRequests}: {
  readonly graphQLRequests: readonly HTTPRequest[];
}): readonly (string | null)[] => graphQLRequests.map(
  (graphQLRequest: HTTPRequest) => getRequestId({graphQLRequest}),
);
