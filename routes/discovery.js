const express = require('express');

const DiscoveryV1 = require('ibm-watson/discovery/v1');
const {IamAuthenticator} = require('ibm-watson/auth');
const config = require('config');

// eslint-disable-next-line new-cap
const router = express.Router();


// 接続情報
const discovery = new DiscoveryV1({
  version: config.get('watson.discovery.version'),
  authenticator: new IamAuthenticator({
    apikey: config.get('watson.discovery.apikey'),
  }),
  serviceUrl: config.get('watson.discovery.serviceUrl'),
});

const createQuery = (categoryLabel, searchStr) => {
  const texts = searchStr.split(' ').map((item) => `text:"${item}"`).join(',');
  return `enriched_text.categories.label::"${categoryLabel}",(${texts})`;
};

const runQuery = async (categoryLabel, searchStr) => {
  const query = createQuery(categoryLabel, searchStr);

  const queryParams = {
    environmentId: config.get('watson.discovery.environmentId'),
    collectionId: config.get('watson.discovery.collectionId'),
    highlight: true,
    query,
    _return: 'highlight',
  };

  console.log(`Running query - ${query}`);
  const queryResponse = await discovery.query(queryParams);

  // let result = '';
  const results = queryResponse.result.results;
  console.log(JSON.stringify(results, null, '\t'));
  if (queryResponse.result.results && queryResponse.result.results.length > 0) {
    const resultArray = queryResponse.result.results
    // const textArray = resultArray[0].highlight.text
    let alltext = [];
    for (let r of resultArray) {
      const textArray = r.highlight.text;
      const filtered = textArray.map((text) => {
        return text.replace(/<em>/g, '').replace(/<\/em>/g, '');
      });
      alltext.push(filtered);
    }
    return alltext;
  } else {
    return '該当する情報が見つかりませんでした。';
  }
};


router.post('/search', async (req, res) => {
  try {
    if (!req.body.searchText) {
      res.status(400).send('Missing search text.');
      return;
    }

    const responseText = await runQuery('/business and industrial/business software', req.body.searchText);
    res.json({
      responseText,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Failed to call watson service');
  }
});

module.exports = router;
