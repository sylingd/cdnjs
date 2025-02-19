(function (global, factory) {
  if (typeof define === 'function' && define.amd) {
    define('Imgix', ['exports', 'md5', 'js-base64'], factory);
  } else if (typeof exports !== 'undefined') {
    module.exports = factory(exports, require('md5'), require('js-base64').Base64);
  } else {
    var mod = {
      exports: {}
    };
    global.ImgixClient = factory(mod.exports, global.md5, global.Base64);
  }
})(this, function (exports, _md5, _jsBase64) {
  var md5 = _md5;
  var Base64 = _jsBase64.Base64 || _jsBase64;

  // package version used in the ix-lib parameter
  var VERSION = '2.3.0';
  // regex pattern used to determine if a domain is valid
  var DOMAIN_REGEX = /^(?:[a-z\d\-_]{1,62}\.){0,125}(?:[a-z\d](?:\-(?=\-*[a-z\d])|[a-z]|\d){0,62}\.)[a-z\d]{1,63}$/i;
  // minimum generated srcset width
  var MIN_SRCSET_WIDTH = 100;
  // maximum generated srcset width
  var MAX_SRCSET_WIDTH = 8192;
  // default tolerable percent difference between srcset pair widths
  var DEFAULT_SRCSET_WIDTH_TOLERANCE = .08;

  // default quality parameter values mapped by each dpr srcset entry
  var DPR_QUALITIES = {
    1: 75,
    2: 50,
    3: 35,
    4: 23,
    5: 20
  };

  // default ImgixClient settings passed in during instantiation
  var DEFAULTS = {
    domain: null,
    useHTTPS: true,
    includeLibraryParam: true
  };

  var ImgixClient = (function() {
    function ImgixClient(opts) {
      var key, val;

      this.settings = {};

      for (key in DEFAULTS) {
        val = DEFAULTS[key];
        this.settings[key] = val;
      }

      for (key in opts) {
        val = opts[key];
        this.settings[key] = val;
      }

      if (typeof this.settings.domain != "string") {
        throw new Error('ImgixClient must be passed a valid string domain');
      }

      if (DOMAIN_REGEX.exec(this.settings.domain) == null) {
        throw new Error(
          'Domain must be passed in as fully-qualified ' + 
          'domain name and should not include a protocol or any path ' + 
          'element, i.e. "example.imgix.net".');
      }

      if (this.settings.includeLibraryParam) {
        this.settings.libraryParam = "js-" + VERSION;
      }

      this.settings.urlPrefix = this.settings.useHTTPS ? 'https://' : 'http://'
    };

    ImgixClient.prototype.buildURL = function(path, params) {
      path = this._sanitizePath(path);

      if (params == null) {
        params = {};
      }

      var queryParams = this._buildParams(params);
      if (!!this.settings.secureURLToken) {
        queryParams = this._signParams(path, queryParams);
      }

      return this.settings.urlPrefix + this.settings.domain + path + queryParams;
    };

    ImgixClient.prototype._sanitizePath = function(path) {
      // Strip leading slash first (we'll re-add after encoding)
      path = path.replace(/^\//, '');

      if (/^https?:\/\//.test(path)) {
        // Use de/encodeURIComponent to ensure *all* characters are handled,
        // since it's being used as a path
        path = encodeURIComponent(path);
      } else {
        // Use de/encodeURI if we think the path is just a path,
        // so it leaves legal characters like '/' and '@' alone
        path = encodeURI(path).replace(/[#?:]/g, encodeURIComponent);
      }

      return '/' + path;
    };

    ImgixClient.prototype._buildParams = function(params) {
      if (this.settings.libraryParam) {
        params.ixlib = this.settings.libraryParam
      }

      var queryParams = [];
      var key, val, encodedKey, encodedVal;
      for (key in params) {
        val = params[key];
        encodedKey = encodeURIComponent(key);
        encodedVal;

        if (key.substr(-2) === '64') {
          encodedVal = Base64.encodeURI(val);
        } else {
          encodedVal = encodeURIComponent(val);
        }
        queryParams.push(encodedKey + "=" + encodedVal);
      }

      if (queryParams[0]) {
        queryParams[0] = "?" + queryParams[0];
      }
      return queryParams.join('&');
    };

    ImgixClient.prototype._signParams = function(path, queryParams) {
      var signatureBase = this.settings.secureURLToken + path + queryParams;
      var signature = md5(signatureBase);

      if (queryParams.length > 0) {
        return queryParams = queryParams + "&s=" + signature;
      } else {
        return queryParams = "?s=" + signature;
      }
    };

    ImgixClient.prototype.buildSrcSet = function (path, params, options) {
      var params = params || {};
      var width = params.w;
      var height = params.h;
      var aspectRatio = params.ar;
      var options = options || {};

      if ((width) || (height && aspectRatio)) {
        return this._buildDPRSrcSet(path, params, options);
      } else {
        return this._buildSrcSetPairs(path, params, options);
      }
    };

    ImgixClient.prototype._buildSrcSetPairs = function(path, params, options) {
      var srcset = '';
      var currentWidth;
      var targetWidths;
      var customWidths = options.widths;
      var srcsetOptions = validateAndDestructureOptions(options);
      var widthTolerance = srcsetOptions[0], minWidth = srcsetOptions[1], maxWidth = srcsetOptions[2];

      if (customWidths) {
        validateWidths(customWidths);
        targetWidths = customWidths;
      } else {
        validateRange(minWidth, maxWidth);
        validateWidthTolerance(widthTolerance);
        targetWidths = this._generateTargetWidths(widthTolerance, minWidth, maxWidth);
      }

      for (var i = 0; i < targetWidths.length; i++) {
        currentWidth = targetWidths[i];
        params.w = currentWidth;
        srcset += this.buildURL(path, params) + ' ' + currentWidth + 'w,\n';
      }

      return srcset.slice(0,-2);
    };

    ImgixClient.prototype._buildDPRSrcSet = function(path, params, options) {
        var srcset = '';
        var targetRatios = [1, 2, 3, 4, 5];
        var currentRatio;
        var disableVariableQuality = options.disableVariableQuality || false;
        var quality = params.q;

        if (!disableVariableQuality) {
          validateVariableQuality(disableVariableQuality);
        }

        for (var i = 0; i < targetRatios.length; i++) {
          currentRatio = targetRatios[i];
          params.dpr = currentRatio;

          if (!disableVariableQuality) {
            params.q = quality || DPR_QUALITIES[currentRatio];
          }

          srcset += this.buildURL(path, params) + ' ' + currentRatio + 'x,\n'
        }

        return srcset.slice(0,-2);
    };

    // a cache to store memoized srcset width-pairs
    ImgixClient.prototype.targetWidthsCache = {};

    // returns an array of width values used during scrset generation
    ImgixClient.prototype._generateTargetWidths = function(widthTolerance, minWidth, maxWidth) {
      var resolutions = [];
      var INCREMENT_PERCENTAGE = widthTolerance;
      var minWidth = Math.floor(minWidth);
      var maxWidth = Math.floor(maxWidth);
      var cacheKey = INCREMENT_PERCENTAGE + '/' + minWidth + '/' + maxWidth;

      if (cacheKey in this.targetWidthsCache) {
        return this.targetWidthsCache[cacheKey];
      }

      var ensureEven = function(n){
        return 2 * Math.round(n / 2);
      };

      var prev = minWidth;
      while (prev < maxWidth) {
        resolutions.push(ensureEven(prev));
        prev *= 1 + (INCREMENT_PERCENTAGE * 2);
      }

      resolutions.push(maxWidth);

      this.targetWidthsCache[cacheKey] = resolutions;

      return resolutions;
    };

    function validateAndDestructureOptions(options) {
      if (options.widthTolerance !== undefined) {
        validateWidthTolerance(options.widthTolerance);
        widthTolerance = options.widthTolerance;
      } else {
        widthTolerance = DEFAULT_SRCSET_WIDTH_TOLERANCE;
      }

      minWidth = options.minWidth === undefined ? MIN_SRCSET_WIDTH : options.minWidth;
      maxWidth = options.maxWidth === undefined ? MAX_SRCSET_WIDTH : options.maxWidth;

      // Validate the range unless we're using defaults for both
      if (minWidth != MIN_SRCSET_WIDTH || maxWidth != MAX_SRCSET_WIDTH) {
        validateRange(minWidth, maxWidth);
      }

      return [widthTolerance, minWidth, maxWidth];
    };

    function validateRange(min, max) {
      if (!(Number.isInteger(min) && Number.isInteger(max)) || (min <= 0 || max <= 0) || (min > max)) {
          throw new Error('The min and max srcset widths can only be passed positive Number values');
      }
    };

    function validateWidthTolerance(widthTolerance) {
      if (typeof widthTolerance != 'number' || widthTolerance <= 0) {
        throw new Error('The srcset widthTolerance argument can only be passed a positive scalar number');
      }
    };

    function validateWidths(customWidths) {
      if (!Array.isArray(customWidths) || !customWidths.length) {
        throw new Error('The widths argument can only be passed a valid non-empty array of integers');
      } else {
        allPositiveIntegers = customWidths.every(
          function(width) {
            return Number.isInteger(width) && width > 0
          }
        );
        if (!allPositiveIntegers) {
          throw new Error('A custom widths argument can only contain positive integer values');
        }
      }
    };

    function validateVariableQuality(disableVariableQuality) {
      if (typeof disableVariableQuality != 'boolean') {
        throw new Error('The disableVariableQuality argument can only be passed a Boolean value');
      }
    };

    ImgixClient.VERSION = VERSION;

    return ImgixClient;
  })();

  return ImgixClient;
});
