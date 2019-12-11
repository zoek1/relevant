const fs = require('fs');
const parse = require('url-parse');
const Hapi = require('@hapi/hapi');
const mongo = require('mongodb').MongoClient;
const CronJob = require('cron').CronJob;
const crypto = require("crypto");
const Boom = require('@hapi/boom')

const {initArweave, isTxSynced, dispatchTX} = require('./routines/arweave');
const {parseRSSFeed, getEntriesSince} = require('./routines/feeds');

const argv = require('yargs')
  .usage('Usage: $0 <command> [options]')
  .command('relevant', 'The permafeed indexer')
  .option('port', {
    alias: 'p',
    nargs: 1,
    description: 'server port number',
    default: 1908,
    type: 'number'
  })
  .option('host', {
    alias: 'H',
    nargs: 1,
    description: 'server host address',
    default: 'localhost',
    type: 'string'
  })
  .option('arweave', {
    alias: 'a',
    nargs: 1,
    coerce: parse,
    description: 'Arweave URL host',
    default: 'https://arweave.net',
    type: 'string'
  })
  .option('wallet-file', {
    alias: 'w',
    nargs: 1,
    description: 'wallet to get ar tokens',
    demandOption: 'Specify a wallet file',
    type: 'string'
  })
  .help('help')
  .argv;


const raw_wallet = fs.readFileSync(argv.walletFile);
const wallet = JSON.parse(raw_wallet);

const arweave = initArweave(argv.arweave);

const url = 'mongodb://localhost:27017'

let client;
let db;


const HOURLY = '0 0 1 * * *';
const MINUTES = '0 * * * * *';

const getSiteDomain = (site_raw) => {
  console.log(site_raw)
  let site = parse(site_raw);
  let domain = site.host
  let protocol = site.protocol || 'http:'
  let path = site.pathname || '/'
  let fullsite = `${protocol}//${domain}${path}`

  return {
    fullsite,
    protocol,
    path,
    domain: site.host.split('.').slice(-2).join('.'),
    feedUrl: site_raw
  };
};


const build_document = (feed, entry, url) => {
  return {
    site: {
      title: feed.title,
      link: feed.link,
      date: feed.pubDate,
      description: feed.description
    },
    item: entry,
    feedUrl: url,
    pubDateObj: new Date(entry.pubDate),
    published: false, tx: null
  };
};

const harvestSite = async (site) => {
    try {
      let feed = await parseRSSFeed(site.feedUrl);
      let collection = db.collection('entries')
      console.log(`Title: ${feed.title}`);
      console.log(`Link: ${feed.link}`);
      console.log(`Items: ${feed.items.length}`);
      let last = collection.find({'feedUrl': site.feedUrl}).sort({pubDateObj: -1}).limit(1).toArray((err, last) => {
        let entries = last.length === 1 ? getEntriesSince(feed, last[0].pubDateObj) : feed.items;
        entries.forEach(e => {
          console.log(`[${e.pubDate}] ${e.title} `);
          // console.log(build_document(feed, e))
          collection.insertOne(build_document(feed, e, site.feedUrl))
        });
        return entries.length;
      });

    } catch (e) {
      console.log(e);
      return null;
    }
};

const buildTxData = (next) => {
  return next.item;
};
const buildTxTags = (next) => {
  return {...next.site, createdBy: 'Relevant',};
};

const start_jobs = async () => {
  console.log(`Start jobs`);
  // Retrieve new entries
  let retrieveEntries = new CronJob(HOURLY, function() {
    console.log(`== Running entries retriever!`);
    db.collection('sites').find({}).toArray((err, sites) => {
      sites.forEach( (site) => { harvestSite(site) })
    })
  });

  // Deploy next entry
  let deployEntries = new CronJob(MINUTES, async function(){
    let collection = db.collection('entries');
    console.log(`== Check sincronization`);
    let last = await collection.findOne({published: false, tx: {$ne: null}});
    if (last !== undefined && last !== null && last !== '') {
      console.log(`== Active Tx: ${typeof last}`);
      let synced = await isTxSynced(last.tx);
      if (synced === 200) {
        console.log(`Liberando: ${last.tx}`);
        collection.update({_id: last._id}, {published: true})
      }
    } else {
      console.log(`== Select next entry`);
      let next = await db.collection('entries').findOne({tx: null});
      console.log(next)
      if (last === undefined || last === null || last === '') {
        console.log('--- No task exists')
        return;
      }
      let {response, tx} = dispatchTX(client, buildTxData(next), buildTxTags(next), wallet)
      if (response.status === 200) {
        console.log(`New pending transaction: ${tx.get('id')}`);
        collection.update({_id: last._id}, {$set: {'tx': tx.get('id'), published: false }})
      }
    }
  });

  retrieveEntries.start();
  deployEntries.start()
};

const init = async () => {
  const server = Hapi.server({
    port: argv.port,
    host: argv.host
  });

  await server.register(require('@hapi/vision'));
  server.views({
    engines: {
      html: require('ejs')
    },
    relativeTo: __dirname,
    path: 'templates'
  });

  server.route({
    method: 'GET',
    path: '/',
    handler: async (request, h) => {
      try {
        const address = await arweave.wallets.jwkToAddress(wallet);
        const balance = await arweave.wallets.getBalance(address);

        return h.view('index', {address, balance});
      } catch(e){console.log(e)}
    }
  });

  server.route({
    method: 'POST',
    path: '/register',
    handler: async (request, reply) => {
      try{
        let sites = db.collection('sites');
        let site_raw = request.payload.site;
        let obj_site = parse(site_raw);
        let domain = obj_site.host;

        if (domain === '' || domain === undefined) {
          return Boom.badData('Url format must be protocol://domain/path');
        }

        let site = await sites.findOne({feedUrl: site_raw});
        if (site === null) {
          console.log('** Add domain');
          let dominsObj = getSiteDomain(site_raw)
          console.log(dominsObj)
          try {
            let feed = await parseRSSFeed(site_raw);
          } catch (e) {
            return Boom.badData('Sorry the site could be parsed');
          }
          const new_site = await sites.insertOne(dominsObj);
          return {
            status: 'ok',
            message: 'Site created correctly'
          };
        } else {
          console.log('** Domain exists')
          console.log('Domain exists:' + site)
          if (null === await harvestSite(site)) {
            return Boom.badData('Sorry the site could be parsed');
          }
          return {
            status: 'ok',
            message: 'Site already exists'
          };
        }
      } catch(e){
        console.log(e);
        return Boom.badImplementation(`${e}`);
      }
    }
  });

  client = await mongo.connect(url, {useNewUrlParser: true});
  db = client.db('relevant');

  await start_jobs();
  await server.start();
  console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {
  console.log(err);
  process.exit(1);
});

process.on('uncaughtException', function (err) {
  console.log(err);
  process.exit(1);

});

init();