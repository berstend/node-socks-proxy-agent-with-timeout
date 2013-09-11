
/**
 * Module dependencies.
 */

var tls; // lazy-loaded...
var url = require('url');
var extend = require('extend');
var Agent = require('agent-base');
var RainbowSocks = require('rainbowsocks');
var inherits = require('util').inherits;

/**
 * Module exports.
 */

module.exports = SocksProxyAgent;

/**
 * The `SocksProxyAgent`.
 *
 * @api public
 */

function SocksProxyAgent (opts, secure) {
  if (!(this instanceof SocksProxyAgent)) return new SocksProxyAgent(opts);
  if ('string' == typeof opts) opts = url.parse(opts);
  if (!opts) throw new Error('a SOCKS proxy server `host` and `port` must be specified!');
  Agent.call(this, connect);

  var proxy = extend({}, opts);

  // If `true` is passed for `secureEndpoint` the the socket will be
  // upgraded to a TLS socket before the HTTP request is written to it.
  // Defaults to `false`
  this.secureEndpoint = secure || opts.secureEndpoint || false;

  // prefer `hostname` over `host`, and set the `port` if needed
  proxy.host = proxy.hostname || proxy.host;

  // SOCKS doesn't *technically* have a default port, but this is
  // the same default that `curl(1)` uses
  proxy.port = +proxy.port || 1080;

  if (proxy.host && proxy.path) {
    // if both a `host` and `path` are specified then it's most likely the
    // result of a `url.parse()` call... we need to remove the `path` portion so
    // that `net.connect()` doesn't attempt to open that as a unix socket file.
    delete proxy.path;
  }

  this.proxy = proxy;
}
inherits(SocksProxyAgent, Agent);

/**
 * Default options for the "connect" opts object.
 */

var defaults = { port: 80 };
var secureDefaults = { port: 443 };

/**
 * Initiates a SOCKS connection to the specified SOCKS proxy server,
 * which in turn connects to the specified remote host and port.
 *
 * @api public
 */

function connect (req, _opts, fn) {

  var proxy = this.proxy;
  var secureEndpoint = this.secureEndpoint;

  // these `opts` are the connect options to connect to the destination endpoint
  var opts = extend({}, proxy, secureEndpoint ? secureDefaults : defaults, _opts);

  var socks = new RainbowSocks(proxy.port, proxy.host);
  socks.once('connect', function (err) {
    if (err) return fn(err);
    socks.connect(opts.host, opts.port, function (err, socket) {
      if (err) return fn(err);
      var s = socket;
      if (secureEndpoint) {
        // since the proxy is connecting to an SSL server, we have
        // to upgrade this socket connection to an SSL connection
        if (!tls) tls = require('tls');
        opts.socket = socket;
        opts.servername = opts.host;
        opts.host = null;
        opts.hostname = null;
        opts.port = null;
        s = tls.connect(opts);
      }
      fn(null, s);
    });
  });
};
