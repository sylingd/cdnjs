/**
 * Infinite Ajax Scroll v3.0.0-beta.5
 * Turn your existing pagination into infinite scrolling pages with ease
 *
 * Commercial use requires one-time purchase of a commercial license
 * https://infiniteajaxscroll.com/docs/license.html
 *
 * Copyright 2014-2019 Webcreate (Jeroen Fiege)
 * https://infiniteajaxscroll.com
 */
import $ from 'tealight';
import extend from 'extend';
import throttle from 'lodash.throttle';
import Emitter from 'tiny-emitter';

var defaults = {
  item: undefined,
  next: undefined,
  pagination: undefined,
  responseType: 'document',
  bind: true,
  scrollContainer: window,
  spinner: false,
  logger: true,
  loadOnScroll: true
};

var Assert = {
  singleElement: function singleElement(elementOrSelector, property) {
    var $element = $(elementOrSelector);

    if ($element.length > 1) {
      throw new Error(("Expected single element for \"" + property + "\""));
    }
    
    if ($element.length === 0) {
      throw new Error(("Element \"" + elementOrSelector + "\" not found for \"" + property + "\""));
    }
  }
};

function getScrollPosition(el) {
  if (el !== window) {
    return {
      x: el.scrollLeft,
      y: el.scrollTop,
    };
  }

  var supportPageOffset = window.pageXOffset !== undefined;
  var isCSS1Compat = ((document.compatMode || "") === "CSS1Compat");

  return {
    x: supportPageOffset ? window.pageXOffset : isCSS1Compat ? document.documentElement.scrollLeft : document.body.scrollLeft,
    y: supportPageOffset ? window.pageYOffset : isCSS1Compat ? document.documentElement.scrollTop : document.body.scrollTop
  };
}

function getRootRect(el) {
  var rootRect;

  if (el !== window) {
    rootRect = el.getBoundingClientRect();
  } else {
    // Use <html>/<body> instead of window since scroll bars affect size.
    var html = document.documentElement;
    var body = document.body;

    rootRect = {
      top: 0,
      left: 0,
      right: html.clientWidth || body.clientWidth,
      width: html.clientWidth || body.clientWidth,
      bottom: html.clientHeight || body.clientHeight,
      height: html.clientHeight || body.clientHeight
    };
  }

  return rootRect;
}

function getDistanceToFold(el, scrollContainer) {
  var scroll = getScrollPosition(scrollContainer);
  var rootRect = getRootRect(scrollContainer);
  var boundingRect = el.getBoundingClientRect();

  var scrollYBottom = scroll.y + rootRect.height;
  var bottom = scroll.y + boundingRect.bottom - rootRect.top;

  return bottom - scrollYBottom;
}

var defaultLastScroll = {
  y: 0,
  x: 0,
  deltaY: 0,
  deltaX: 0
};

function calculateScroll(scrollContainer, lastScroll) {
  var scroll = getScrollPosition(scrollContainer);

  scroll.deltaY = scroll.y - (lastScroll ? lastScroll.y : scroll.y);
  scroll.deltaX = scroll.x - (lastScroll ? lastScroll.x : scroll.x);

  return scroll;
}

function scrollHandler() {
  var ias = this;
  var lastScroll = ias._lastScroll || defaultLastScroll;

  var scroll = ias._lastScroll = calculateScroll(ias.scrollContainer, lastScroll);

  this.emitter.emit('scrolled', {scroll: scroll});

  this.measure();
}

function resizeHandler() {
  var ias = this;
  var lastScroll = ias._lastScroll || defaultLastScroll;

  var scroll = ias._lastScroll = calculateScroll(ias.scrollContainer, lastScroll);

  this.emitter.emit('resized', {scroll: scroll});

  this.measure();
}

function nextHandler(pageIndex) {
  var ias = this;
  var lastResponse = ias._lastResponse || document;

  var nextEl = $(ias.options.next, lastResponse)[0];

  if (!nextEl) {
    return;
  }

  var nextUrl = nextEl.href;

  return ias.load(nextUrl)
    .then(function (data) {
      lastResponse = ias._lastResponse = data.xhr.response;

      var nextEl = $(ias.options.next, lastResponse)[0];

      return ias.append(data.items)
        .then(function () {
          return !!nextEl;
        });
    });
}

var defaults$1 = {
  element: undefined,
  hide: false
};

function expand(options) {
  if (typeof options === 'string') {
    options = {
      element: options,
      hide: true,
    };
  } else if (typeof options === 'boolean') {
    options = {
      element: undefined,
      hide: options,
    };
  }

  return options;
}

var Pagination = function Pagination(ias, options) {
  this.options = extend({}, defaults$1, expand(options));

  if (!this.options.hide) {
    return;
  }

  Assert.singleElement(this.options.element, 'pagination.element');

  ias.on('binded', this.hide.bind(this));
  ias.on('unbinded', this.restore.bind(this));
};

Pagination.prototype.hide = function hide () {
  var el = $(this.options.element)[0];

  this.originalDisplayStyle = window.getComputedStyle(el).display;

  el.style.display = 'none';
};

Pagination.prototype.restore = function restore () {
  var el = $(this.options.element)[0];

  el.style.display = this.originalDisplayStyle;
};

var defaults$2 = {
  element: undefined,
  delay: 600,
  show: function (element) {
    element.style.opacity = '1';
  },
  hide: function (element) {
    element.style.opacity = '0';
  }
};

function expand$1(options) {
  if (typeof options === 'string') {
    options = {
      element: options,
    };
  }

  return options;
}

var Spinner = function Spinner(ias, options) {
  // no spinner wanted
  if (options === false) {
    return;
  }

  this.ias = ias;
  this.options = extend({}, defaults$2, expand$1(options));

  if (this.options.element !== undefined) {
    Assert.singleElement(this.options.element, 'spinner.element');
  }

  this.element = $(this.options.element)[0]; // @todo should we really cache this?
  this.hideFn = this.options.hide;
  this.showFn = this.options.show;

  ias.on('binded', this.bind.bind(this));
  ias.on('binded', this.hide.bind(this));
};

Spinner.prototype.bind = function bind () {
  var startTime, endTime, diff, delay, self = this, ias = this.ias;

  ias.on('next', function () {
    startTime = +new Date();

    self.show();
  });

  ias.on('last', function () {
    self.hide();
  });

  // setup delay
  ias.on('append', function (event) {
    endTime = +new Date();
    diff = endTime - startTime;

    delay = Math.max(0, self.options.delay - diff);

    // copy original append function
    var appendFn = event.appendFn;

    // wrap append function with delay
    event.appendFn = function (items, parent, last) {
      return new Promise(function (resolve) {
        setTimeout(function () {
          // turn hide function into promise
          Promise.resolve(self.hide()).then(function () {
            appendFn(items, parent, last);

            resolve();
          });
        }, delay);
      });
    };
  });
};

Spinner.prototype.show = function show () {
  return Promise.resolve(this.showFn(this.element));
};

Spinner.prototype.hide = function hide () {
  return Promise.resolve(this.hideFn(this.element));
};

/* eslint no-console: "off" */

var defaultLogger = {
  hit: function () {
    console.log("Hit scroll threshold");
  },
  binded: function () {
    console.log("Binded event handlers");
  },
  unbinded: function () {
    console.log("Unbinded event handlers");
  },
  // scrolled: (event) => {
  //   console.log('Scrolled');
  // },
  // resized: (event) => {
  //   console.log('Resized');
  // },
  next: function (event) {
    console.log(("Next page triggered [pageIndex=" + (event.pageIndex) + "]"));
  },
  load: function (event) {
    console.log(("Start loading " + (event.url)));
  },
  loaded: function () {
    console.log("Finished loading");
  },
  append: function () {
    console.log("Start appending items");
  },
  appended: function (event) {
    console.log(("Finished appending " + (event.items.length) + " item(s)"));
  },
  last: function () {
    console.log("No more pages left to load");
  },
  page: function (event) {
    console.log(("Page changed [pageIndex=" + (event.pageIndex) + "]"));
  }
};

function expand$2(options) {
  if (options === true) {
    options = defaultLogger;
  }

  return options;
}

var Logger = function Logger(ias, options) {
  // no logger wanted
  if (options === false) {
    return;
  }

  var logger = expand$2(options);

  Object.keys(logger).forEach(function (key) {
    ias.on(key, logger[key]);
  });
};

function getPageBreak(pageBreaks, scrollTop, scrollContainer) {
  var rootRect = getRootRect(scrollContainer);
  var scrollBottom = scrollTop + rootRect.height;

  for (var b = pageBreaks.length - 1; b >= 0; b--) {
    var bottom = pageBreaks[b].sentinel.getBoundingClientRect().bottom + scrollTop;

    if (scrollBottom > bottom) {
      var x = Math.min(b + 1, pageBreaks.length - 1);

      return pageBreaks[x];
    }
  }

  return pageBreaks[0];
}

var Paging = function Paging(ias) {
  this.ias = ias;
  this.pageBreaks = [];
  this.currentPageIndex = ias.pageIndex;
  this.currentScrollTop = 0;

  ias.on('binded', this.binded.bind(this));
  ias.on('next', this.next.bind(this));
  ias.on('scrolled', this.scrolled.bind(this));
  ias.on('resized', this.scrolled.bind(this));
};

Paging.prototype.binded = function binded () {
  var sentinel = this.ias.sentinel();
  if (!sentinel) {
    return;
  }

  this.pageBreaks.push({
    pageIndex: this.currentPageIndex,
    url: document.location.toString(),
    title: document.title,
    sentinel: this.ias.sentinel()
  });
};

Paging.prototype.next = function next (nextEvent) {
    var this$1 = this;

  var url;
  var title;

  // @todo can be moved inside appended when eventStack is implemented
  var loaded = function (event) {
    url = event.url;

    if (event.xhr.response) {
      title = event.xhr.response.title;
    }
  };

  this.ias.once('loaded', loaded);

  this.ias.once('appended', function () {
    this$1.pageBreaks.push({
      pageIndex: nextEvent.pageIndex,
      url: url,
      title: title,
      sentinel: this$1.ias.sentinel()
    });

    this$1.update();

    // @todo can be removed when eventStack is implemented
    this$1.ias.off('loaded', loaded);
  });
};

Paging.prototype.scrolled = function scrolled (event) {
  this.update(event.scroll.y);
};

Paging.prototype.update = function update (scrollTop) {
  this.currentScrollTop = scrollTop || this.currentScrollTop;

  var pageBreak = getPageBreak(this.pageBreaks, this.currentScrollTop, this.ias.scrollContainer);

  if (pageBreak && pageBreak.pageIndex !== this.currentPageIndex) {
    this.ias.emitter.emit('page', pageBreak);

    this.currentPageIndex = pageBreak.pageIndex;
  }
};

function appendFn(items, parent, last) {
  var sibling = last ? last.nextSibling : null;
  var insert = document.createDocumentFragment();

  items.forEach(function (item) {
    insert.appendChild(item);
  });

  parent.insertBefore(insert, sibling);
}

var InfiniteAjaxScroll = function InfiniteAjaxScroll(container, options) {
  var this$1 = this;
  if ( options === void 0 ) options = {};

  Assert.singleElement(container, 'container');

  this.container = $(container)[0];
  this.options = extend({}, defaults, options);
  this.emitter = new Emitter();
  this.scrollContainer = this.options.scrollContainer;

  if (this.options.scrollContainer !== window) {
    Assert.singleElement(this.options.scrollContainer, 'options.scrollContainer');

    this.scrollContainer = $(this.options.scrollContainer)[0];
  }

  this.nextHandler = nextHandler;
  if (typeof this.options.next === 'function') {
    this.nextHandler = this.options.next;
  }

  this.binded = false;
  this.paused = false;
  this.loadOnScroll = this.options.loadOnScroll;
  this.pageIndex = this.sentinel() ? 0 : -1;
  this.lastDistance = null;

  this.on('hit', function () {
    if (!this$1.loadOnScroll) {
      return;
    }

    this$1.next();
  });

  // initialize extensions
  this.pagination = new Pagination(this, this.options.pagination);
  this.spinner = new Spinner(this, this.options.spinner);
  this.logger = new Logger(this, this.options.logger);
  this.paging = new Paging(this);

  // @todo review this logic when prefill support is added
  this.on('binded', this.measure);

  if (this.options.bind) {
    // @todo on document.ready? (window.addEventListener('DOMContentLoaded'))
    this.bind();
  }
};

InfiniteAjaxScroll.prototype.bind = function bind () {
  if (this.binded) {
    return;
  }

  this._scrollListener = throttle(scrollHandler, 200).bind(this);
  this._resizeListener = throttle(resizeHandler, 200).bind(this);

  this.scrollContainer.addEventListener('scroll', this._scrollListener);
  this.scrollContainer.addEventListener('resize', this._resizeListener);

  this.binded = true;

  this.emitter.emit('binded');
};

InfiniteAjaxScroll.prototype.unbind = function unbind () {
  if (!this.binded) {
    return;
  }

  this.scrollContainer.removeEventListener('resize', this._resizeListener);
  this.scrollContainer.removeEventListener('scroll', this._scrollListener);

  this.binded = false;

  this.emitter.emit('unbinded');
};

InfiniteAjaxScroll.prototype.next = function next () {
    var this$1 = this;

  this.pause();

  var event = {
    pageIndex: this.pageIndex + 1,
  };

  this.emitter.emit('next', event);

  Promise.resolve(this.nextHandler(event.pageIndex))
      .then(function (result) {
        this$1.pageIndex = event.pageIndex;

        if (!result) {
          this$1.emitter.emit('last');

          return;
        }

        this$1.resume();
      })
  ;
};

InfiniteAjaxScroll.prototype.load = function load (url) {
  var ias = this;

  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function() {
      if (xhr.readyState !== XMLHttpRequest.DONE) {
        return;
      }

      if (xhr.status === 200) {
        var items = xhr.response;

        if (ias.options.responseType === 'document') {
          items = $(ias.options.item, xhr.response);
          // @todo assert there actually are items in the response
        }

        ias.emitter.emit('loaded', {items: items, url: url, xhr: xhr});

        resolve({items: items, url: url, xhr: xhr});
      } else {
        // @todo is console.error the best approach?
        console.error('Request failed');

        reject(xhr);
      }
    };

    // FIXME: make no-caching configurable
    // @see https://developer.mozilla.org/nl/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest#Bypassing_the_cache
    var nocacheUrl = url + ((/\?/).test(url) ? "&" : "?") + (new Date()).getTime();

    xhr.open('GET', nocacheUrl, true);
    xhr.responseType = ias.options.responseType;
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

    // @todo define event variable and pass that around so it can be manipulated

    ias.emitter.emit('load', {url: url, xhr: xhr});

    xhr.send();
  });
};

/**
 * @param {array<Element>} items
 * @param {Element|null} parent
 */
InfiniteAjaxScroll.prototype.append = function append (items, parent) {
  var ias = this;
  parent = parent || ias.container;

  var event = {
    items: items,
    parent: parent,
    appendFn: appendFn
  };

  ias.emitter.emit('append', event);

  var executor = function (resolve) {
    window.requestAnimationFrame(function () {
      Promise.resolve(event.appendFn(event.items, event.parent, ias.sentinel())).then(function () {
        resolve({items: items, parent: parent});
      });
    });
  };

  return (new Promise(executor)).then(function (event) {
    ias.emitter.emit('appended', event);
  });
};

InfiniteAjaxScroll.prototype.sentinel = function sentinel () {
  var items = $(this.options.item, this.container);

  if (!items.length) {
    return null;
  }

  return items[items.length-1];
};

InfiniteAjaxScroll.prototype.pause = function pause () {
  this.paused = true;
};

InfiniteAjaxScroll.prototype.resume = function resume () {
  this.paused = false;

  this.measure();
};

InfiniteAjaxScroll.prototype.enableLoadOnScroll = function enableLoadOnScroll () {
  this.loadOnScroll = true;
};

InfiniteAjaxScroll.prototype.disableLoadOnScroll = function disableLoadOnScroll () {
  this.loadOnScroll = false;
};

InfiniteAjaxScroll.prototype.measure = function measure () {
  if (this.paused) {
    return;
  }

  var distance = 0;
  var sentinel = this.sentinel();

  // @todo review this logic when prefill support is added
  if (sentinel) {
    distance = getDistanceToFold(sentinel, this.scrollContainer);
  }

  if (distance <= 0 && (this.lastDistance === null || this.lastDistance > 0)) {
    this.emitter.emit('hit', {distance: distance});
  }

  this.lastDistance = distance;
};

InfiniteAjaxScroll.prototype.on = function on (event, callback) {
  this.emitter.on(event, callback, this);

  if (event === 'binded' && this.binded) {
    callback.bind(this)();
  }
};

InfiniteAjaxScroll.prototype.off = function off (event, callback) {
  this.emitter.off(event, callback, this);
};

InfiniteAjaxScroll.prototype.once = function once (event, callback) {
  this.emitter.once(event, callback, this);

  if (event === 'binded' && this.binded) {
    callback.bind(this)();
  }
};

export default InfiniteAjaxScroll;
