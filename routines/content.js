const JSDOM = require('jsdom').JSDOM;
const Readability = require('readability-nodejs').Readability;
const createDOMPurify = require('dompurify');
const axios = require('axios');

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

  if (argv.url) {
    getContent(argv.url).then((r) => r && console.log(r.textContent))
  }
}

module.exports = {
    getContent
};
