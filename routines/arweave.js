const Arweave = require('arweave/node');

const initArweave = (config) => {
  return Arweave.init({
    host: config.hostname,
    port: config || 443,
    protocol: config.protocol.replace(':', '') || 'https'
  })
};

async function dispatchTX(client, data, tags, wallet) {
  const tx = await client.createTransaction({data}, wallet);

  Object.keys(tags).map(key => {
    tx.addTag(key, tags[key]);
  });

  // Sign and dispatch the tx
  await client.transactions.sign(tx, wallet);
  const response = await client.transactions.post(tx);

  let output = `Transaction ${tx.get('id')} dispatched with response: ${response.status}.`;
  console.log(output);

  return {
    response: response,
    tx: tx
  };
}

const isTxSynced = async (client, tx) => {
  return await client.transactions.getStatus(tx);
};