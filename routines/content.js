const JSDOM = require('jsdom').JSDOM;
const Readability = require('readability-nodejs').Readability;
const createDOMPurify = require('dompurify');
const axios = require('axios');

const puppeteer = require('puppeteer');
const fs = require('fs');
const readabilityJsStr = fs.readFileSync('node_modules/readability/Readability.js', {encoding: 'utf-8'})

function executor() {
  return new Readability(document).parse();
}

async function getContentFromBrowser(site){
  // based on this snippet https://gist.github.com/MrOrz/fb48f27f0f21846d0df521728fda19ce
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  try {
    await page.goto(site);
  } catch(e) {
    console.error(e);
    return null;
  }

  const resultArticle = await page.evaluate(`
    (function(){
      ${readabilityJsStr}
      ${executor}
      return executor();
    }())
  `);

  browser.close();

  return resultArticle;
}


const generateJSONContent = (url, raw_content) => {
    let window = new JSDOM('').window;
    const DOMPurify = createDOMPurify(window);
    const clean = DOMPurify.sanitize(raw_content);
    let reader = new Readability(new JSDOM(clean, {url}).window.document);
    return reader.parse();
};

const getContent = async (url) => {
  try {
    let res =  await axios.get(url);
    if (res.status === 200) return generateJSONContent(url, res.data);
  } catch (e) {
    console.log(`No accesible: ${url}`);
  }

  return null;
};

if (require.main === module) {
  const argv = require('yargs')
    .usage('Usage: $0 <command> [options]')
    .command('clean', 'Get reader view of the articles', (yargs) => {
      yargs.positional('url', {
        alias: 'u',
        description: 'URL to get content',
        type: 'string'
      })
    })
    .help('help')
    .argv;
  console.log(argv)
  if (argv.url) {
    getContentFromBrowser(argv.url).then((r) => r && console.log(r.textContent))
  }
}

module.exports = {
  getContent,
  getContentFromBrowser
};
