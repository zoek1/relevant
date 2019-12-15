
const getContent = require('./content').getContent;


var natural = require('natural');
var Analyzer = natural.SentimentAnalyzer;
var stemmer = natural.PorterStemmer;
var analyzer = new Analyzer("English", stemmer, "afinn");
var tokenizer = new natural.WordTokenizer();
var Sentiment = require('sentiment');

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

const sentimentRate = async (url) => {
  natural.PorterStemmer.attach();
  let content = await getContent(url);

  if (content === null) {
    return 0;
  }

  var sentiment = new Sentiment();
  var result = sentiment.analyze(content.textContent);

  return analyzer.getSentiment(result.words);
};

module.exports = {
  sentimentRate
};

if (require.main === module) {
  (async () => {
    natural.PorterStemmer.attach();
    let content = await getContent('https://cointelegraph.com/news/crypto-exchange-btse-eyes-50m-for-exchange-token-sale-on-liquid-network');

    var sentiment = new Sentiment();
    var result = sentiment.analyze(content.textContent);

    let tokens = content.textContent.tokenizeAndStem()
    console.log(analyzer.getSentiment(tokens));
    console.log(analyzer.getSentiment(result.words));

  })();
};