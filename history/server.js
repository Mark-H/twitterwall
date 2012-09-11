var twitterlib = require('./twitterlib'),
    config = require('../config'),
    fs = require('fs'),
    sys = require('sys'),
    debug = true,
    lastId = {
      list: 1,
      search: 1
    },
    counters = {
      list: 0,
      search: 0
    };
    

function save(tweets, options) {
  var type = options.method;
  if (tweets.length) {
    fs.writeFileSync('./data/' + type + (++counters[type]) + '.json', 'callback(' + JSON.stringify(tweets) + ')', 'utf8');
    lastId[type] = tweets[0].id;    
  }
  
  setTimeout(function () {
    getTweets(type);
  }, 60 * 1000 * 5);
}

function getTweets(type) {
  if (type == 'list' && config.list) {
    twitterlib.list(config.list, { since: lastId[type] }, save);
  } else {
    twitterlib.search(config.search, { since: lastId[type] }, save);
  }
}

setTimeout(function () {
  getTweets('search');
}, 60 * 1000 * 2.5); // 2.5 mins 

getTweets('list');