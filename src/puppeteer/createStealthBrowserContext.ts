import puppeteer from 'puppeteer-extra';
import {Browser} from 'puppeteer-core';
import stealth from 'puppeteer-extra-plugin-stealth';

export async function createStealthBrowserContext({
  executablePath = '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome',
  headless = true,
  debug: dumpio = false,
}: {
  readonly executablePath?: string;
  readonly headless?: boolean;
  readonly debug?: boolean;
}) {
  puppeteer.use(stealth());

  const browser = (
    await puppeteer.launch({
      executablePath,
      headless,
      devtools: false,
      dumpio,
      args: [
        '--hide-scrollbars',
        '--mute-audio',
        '--no-sandbox' /* dangerous */,
        '--disable-dev-shm-usage',
      ],
    })
  ) as unknown as Browser;

  return {
    browserContext: await browser.createIncognitoBrowserContext(),
    close: () => browser.close(),
  };
}
