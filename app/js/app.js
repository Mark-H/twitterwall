function Queue(delay, callback) {
  var q = [], 
      timer = null, 
      processed = {}, 
      empty = null, 
      ignoreRT = twitterlib.filter.format('-"RT @"'); // if you want to reuse this queue, ditch this reference
  
  function process() {
    var item = null;
    if (q.length) {
      callback(q.shift());
    } else {
      this.stop(); // don't like this, should change to prototype eventually
      setTimeout(empty, 5000);
    }
    return this;
  }
  
  return {
    push: function (item) {
      var i;
      if (!(item instanceof Array)) {
        item = [item];
      }
      
      if (timer == null && q.length == 0) {
        this.start();
      }
      
      for (i = 0; i < item.length; i++) {
        if (!processed[item[i].id_str] && twitterlib.filter.match(item[i], ignoreRT)) {
          processed[item[i].id_str] = true;
          q.push(item[i]);
        }
      }
      
      // resort the q
      q = q.sort(function (a, b) {
        return a.id_str > b.id_str;
      });

      return this;
    },
    start: function () {
      if (timer == null) {
        timer = setInterval(process, delay);
      }
      return this;
    },
    stop: function () {
      clearInterval(timer);
      timer = null;
      return this;
    },
    toggle: function () {
      return this[timer == null ? 'start' : 'stop']();
    },
    empty: function (fn) {
      empty = fn;
      return this;
    },
    q: q,
    next: process
  };
}; //.start();
 
// selector to find elements below the fold
$.extend($.expr[':'], {
  below: function (a, i, m) {
    var y = m[3];
    return $(a).offset().top > y;
  }
});
 
function parseTime(t) {
  // var parts = t.split(/[:\s]/g),
  //     hour = parts[0] | 0,
  //     min = parts[1] | 0;
 
  // if (parts[2] == 'PM' && hour != 12) hour += 12;
 
  var d = new Date();
  d.setHours(t.substr(0, 2));
  d.setMinutes(t.substr(2, 2));

  return d.getTime();
}
 
function parseTiming(t) {
  t.replace(/.*?([hms]+).*/, function (all, match) {
    var n = all.replace(new RegExp(match), '') * 1;

    if (match === 'ms') {
      // do nothing
    } else if (match === 's') {
      n *= 1000;
    } else if (match === 'm') {
      n *= 60 * 1000;
    } else if (match === 'h') {
      n *= 60 * 60 * 1000;
    }

    t = n;
  });

  return t;
}

function findNextSchedule(delayM, after) {
  var due = null, t = after ? parseTime(after) : (new Date()).getTime() - (delayM);  // wasteful?
  
  for (var s in SCHEDULE) {
    due = s;
    if (parseTime(s) > t) break;
  }
  
  return s;
}
 
function showSchedule(due) {
  if (due != lastDue) {
    lastDue = due;
    $schedule.hide();
    SCHEDULE[due].show();
    $('#schedule').attr('data-time', due);
    // var $content = $('#content div').html(SCHEDULE[due]),
    //     $img = $content.find('img').remove();
    // $content.parent().css('background-image', 'url(' + $img.attr('src') + ')');
    if (due == '7:00 PM') {
//      $('#content').addClass('map');
    }
  }
}
 
function schedule() {
  showSchedule(findNextSchedule(config.showNextScheduleEarlyBy || 0));
}
 
function nextDue() {
  clearInterval(scheduleTimer);
  showSchedule(findNextSchedule(0, lastDue));
}

// only used in testing
function nextSchedule() {
  var keys = Object.keys(SCHEDULE);
  var i = keys.indexOf(lastDue) + 1;
  if (i > keys.length) i = 0;

  showSchedule(keys[i]);
}
 
function getInstagram(id, url) {
  window['embed' + id] = function (data) {
    if (data.type == 'photo') {
      var el = document.getElementById('pic' + id);
      if (el) {
        el.src = data.url;
      }
    }
  };
  var script = document.createElement('script');
  script.src = 'http://api.instagram.com/oembed?url=' + url + '&callback=embed' + id;
  document.body.appendChild(script);
}

function getFlickr(id, url) {
  var apikey = '18702ea1538bc199e2c7e1d57270cd37',
  photoId = url.split('/').pop();

  if (url.indexOf('flic.kr') !== -1) { // short url - decode first
    var num = url.split('/').pop(),
        decoded = 0,
        multi = 1,
        digit = null,
        alphabet = '123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'.split('');
    while (num.length > 0) {
      digit = num.substring(num.length-1);
      decoded += multi * alphabet.indexOf(digit);
      multi = multi * alphabet.length;
      num = num.substring(0, num.length -1);
    }
    photoId = decoded;
  }
  var flickrURL = 'http://api.flickr.com/services/rest/?method=flickr.photos.getInfo&api_key=18702ea1538bc199e2c7e1d57270cd37&photo_id=' + photoId + '&format=json&jsoncallback=embed' + id;

  window['embed' + id] = function (data) {
    if (data.photo) {
      var photo = data.photo,
          el = $('.embed' + id);
        if (el) {
          $(el).replaceWith('<img class="pic" src="http://farm' + photo.farm + '.static.flickr.com/' + photo.server + '/' + photo.id + '_' + photo.secret + '.jpg">');
      }
    }
  };
  var script = document.createElement('script');
  script.src = flickrURL;
  document.body.appendChild(script);

}

function loadImage(id, url) {
  return;
  //  http://www.oohembed.com/oohembed
  window['embed' + id] = function (data) {
    if (data.type == 'photo') {
      var el = document.getElementById('pic' + id);
      if (el) {
        el.src = data.url;
      }
    }
  };
  var script = document.createElement('script');
  script.src = 'http://www.oohembed.com/oohembed?url=' + url + '&callback=embed' + id;
  document.body.appendChild(script);
}

// Simple JavaScript Templating
// John Resig - http://ejohn.org/ - MIT Licensed
(function(){
  var cache = {};
  
  this.tmpl = function tmpl(str, data){
    // Figure out if we're getting a template, or if we need to
    // load the template - and be sure to cache the result.
    var fn = !/\W/.test(str) ?
      cache[str] = cache[str] ||
        tmpl(document.getElementById(str).innerHTML) :
      
      // Generate a reusable function that will serve as a template
      // generator (and which will be cached).
      new Function("obj",
        "var p=[],print=function(){p.push.apply(p,arguments);};" +
        
        // Introduce the data as local variables using with(){}
        "with(obj){p.push('" +
        
        // Convert the template into pure JavaScript
        str
          .replace(/[\r\t\n]/g, " ")
          .split("<%").join("\t")
          .replace(/((^|%>)[^\t]*)'/g, "$1\r")
          .replace(/\t=(.*?)%>/g, "',$1,'")
          .split("\t").join("');")
          .split("%>").join("p.push('")
          .split("\r").join("\\'")
      + "');}return p.join('');");
    
    // Provide some basic currying to the user
    return data ? fn( data ) : fn;
  };
})();

// twitter related processing
function renderTweet(data) {
  var embeds = [];

  if (data.entities && data.entities.urls && data.entities.urls.length) {
    data.entities.urls.forEach(function (urldata) {
      var url = urldata.expanded_url;
      if (url.indexOf('yfrog.com') !== -1) {
        embeds.push('<img class="pic" src="' + url + ':iphone" />');
      } else if (url.indexOf('twitpic.com') !== -1) {
        embeds.push('<img class="pic" src="' + url.replace(/twitpic\.com/, 'twitpic.com/show/large') + '" />');
      } else if (url.indexOf('instagr.am') !== -1) {
        if (url.split('').pop() !== '/') {
          url += '/';
        }
        embeds.push('<img class="pic" id="pic' + data.id_str + '" src="' + url + 'media">');
        //getInstagram(data.id_str, url);
      } else if (url.indexOf('lockerz') !== -1) {
        embeds.push('<img class="pic" src="http://api.plixi.com/api/tpapi.svc/imagefromurl?url=' + url + '" />');
      } else if (url.indexOf('flic.kr') !== -1 || url.indexOf('flickr') !== -1) {
        getFlickr(data.id_str, url);
        embeds.push('<span class="embed' + data.id_str + '"></span>');
      } else if (photoURLs.test(url)) {
        embeds.push('<img class="pic" src="' + url + '" />');
      } else if (photoServiceURLs.test(url)) {
        loadImage(data.id_str, url);
        embeds.push('<img class="pic embed' + data.id_str + '" src="data:image/gif;base64,R0lGODlhAQABAIABAP///wAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" />');
      }
    });
  }

  var html = tweetTemplate({
    id: data.id_str,
    screen_name: data.user.screen_name,
    name: data.user.name,
    profile_image_url: data.user.profile_image_url,
    created_at: data.created_at,
    nice_date: twitterlib.time.datetime(data.created_at),
    embeds: embeds,
    tweet: twitterlib.ify.clean(twitterlib.expandLinks(data))
  });
  
  // since_id is a global tracker to ensure we only hit Twitter for *new* tweets
  since_id = data.id;
  
  return html;
}
 
function passToQueue(data, options) {
  if (data.length) {
    twitterQueue.push(data.reverse());
  }
}
  
// function listenForWinner() {
//   var body = $(document.body);
//   winners = new WebSocket('ws://node.remysharp.com:8003');
//   winners.onmessage = function (event) {
//     var winner = document.getElementById('winner');
//     body.removeClass('bingo');
//     if (event.data == 'close') {
//       body.removeClass('winner');
//       winner.innerHTML = '';
//     } else if (event.data == 'bingo') {
//       body.addClass('bingo');
//     } else {
//       body.addClass('winner');
//       winner.innerHTML = event.data;
//     }
//   };
  
//   // auto reconnect after 2seconds
//   winners.onclose = function () {
//     setTimeout(listenForWinner, 2000);
//   };

//   winners.onerror = function () {
//     setTimeout(listenForWinner, 2000);
//   };
// }

function run() {
  var since_id = 1;
  $(document.body).addClass('run');

  var options = { since: since_id };

  var tweets = twitterlib.search(config.search, options, passToQueue);
  if (config.list) tweets.list(config.list, options, passToQueue);
};

function notices() {
  var $notices = $('#notices > div');

  if ($notices.length > 1) {
    // rotate
    var current = 0,
        length = $notices.length;

    var show = function () {
      var $current = $notices.removeClass('show').eq(current % length).addClass('show'),
          customTiming = $current[0].getAttribute('data-hold-time')
      current++;

      if (customTiming) {
        customTiming = parseTiming(customTiming);
      }

      setTimeout(show, customTiming || config.timings.defaultNoticeHoldTime || 10 * 1000);
    };
    show();
  } 
}

function init() {
  if (config.title) document.title = config.title;

  if (config.debug) {
    twitterlib.debug({
      'list': '../history/data/list%page%.json?callback=callback', 
      'search': '../history/data/search%page%.json?callback=callback'
    });
  }

  // fucking twitter and their daft date format
  var date = new Date(),
      year = date.getYear() + 1900,
      d = date.toString();

  d = d.replace(/\D{3}\+/, '+').replace(/\s\(.*\)/, '').replace(new RegExp(year + ' '), '') + ' ' + year;

  $('#schedule > div').hide();

  run();
  schedule();
  notices();
  // listenForWinner();
}

if (config.timings) {
  for (var key in config.timings) {
    // convert string times to milliseconds
    config.timings[key] = parseTiming(config.timings[key]);
  }
}



// schedule based processing
var SCHEDULE = {},
    $schedule = $('#schedule > div').each(function () {
      SCHEDULE[this.getAttribute('data-time')] = $(this);
    }),
    photoServiceURLs = new RegExp('(flickr|instagr.am)'),
    photoURLs = new RegExp('(.jpg|.jpeg|.png|.gif)$'),
    tweetTemplate = tmpl('tweet_template'),
    lastDue = null,
    winners = {};

var scheduleTimer = setInterval(schedule, 5000);

// start a new queue and on the callback, render the tweet and animate it down
var twitterQueue = new Queue(config.timings.showTweetsEvery || 3000, function (item) {
  // 1. stuff a new p tag, and animate it up - to force content down (with text:visibility:hidden)
  // 2. drop effect from top of page
  // 3. once effect complete, remove animated el, and show text to fake effect  
  var tweet = $(renderTweet(item));
  var tweetClone = tweet.clone().hide().css({ visibility: 'hidden' }).prependTo('#tweets').slideDown(1000);
 
  tweet.css({ top: -200, position: 'absolute' }).prependTo('#tweets').animate({
    top: 0
  }, 1000, function () {
    tweetClone.css({ visibility: 'visible' });
    $(this).remove();
  });
  
  // remove elements that aren't visible
  $('#tweets p:below(' + window.innerHeight + ')').remove();
}).empty(run);

// click on the schedule to move forward (for testing)
$('#schedule').click(nextDue);

// space pauses twitter feed
$(window).keydown(function (event) {
  if (event.which === 32) {
    twitterQueue.toggle();
  }
});

init();








