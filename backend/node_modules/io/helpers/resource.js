const https = require('https');
const http = require('http');

class APIResourceRequest {

  constructor (parent, path) {

    this.parent = parent;
    this.path = path[0] === '/' ? path : `/${path}`;
    this._headers = {};

  }

  headers (obj) {
    this._headers = obj;
    return this;
  }

  /* CRUD Methods */

  async index (params) {
    return await this.get(null, params);
  }

  async show (id, params) {
    return await this.get(id, params);
  }

  async destroy (id, params) {
    return await this.del(id, params);
  }

  async update (id, params, data) {
    return await this.put(id, params, data);
  }

  async create (params, data) {
    return await this.post(null, params, data);
  }

  /* HTTP methods */

  async put (id, params, data) {
    return await this.requestJSON('PUT', id, params, data);
  }

  async post (id, params, data) {
    return await this.requestJSON('POST', id, params, data);
  }

  async del (id, params) {
    return await this.requestJSON('DELETE', id, params, null);
  }

  async get (id, params) {
    return await this.requestJSON('GET', id, params, null);
  }

  /* Request methods */

  async requestJSON (method, id, params, data, streamListener, options) {
    return await this.__request__(true, method, id, params, data, streamListener, options);
  }

  async request (method, id, params, data, streamListener, options) {
    return await this.__request__(false, method, id, params, data, streamListener, options);
  }

  async stream (method, data, onMessage, options) {

    options = typeof options === 'object'
      ? options || {}
      : {};
      let timeout = (options.hasOwnProperty('timeout') && typeof options.timeout === 'number')
      ? Math.min(Math.max(options.timeout, -1), 600_000)
      : void 0;
    let connectTimeout = (options.hasOwnProperty('connectTimeout') && typeof options.connectTimeout === 'number')
      ? Math.min(Math.max(options.connectTimeout, 0), 600_000)
      : void 0;
    let maxBytes = (options.hasOwnProperty('maxBytes') && typeof options.maxBytes === 'number')
      ? Math.min(Math.max(options.maxBytes, 0), 1_024 * 1_024 * 1_024) // 1GB
      : void 0;
    const opts = { timeout, connectTimeout, maxBytes };

    let headers = this.__formatHeaders__();
    let url = this.path;

    let startTime = new Date().valueOf();
    let { req, res } = await this.__send__(method, url, headers, data, opts);
    let buffers = [];

    return new Promise((resolve, reject) => {

      let settled = false;

      res.on('data', chunk => {
        if (settled) {
          return;
        }
        if (opts.timeout !== void 0 && new Date().valueOf() - startTime > opts.timeout) {
          settled = true;
          req.destroy();
          reject(new Error(`Request download timed out: ${opts.timeout}ms reached`));
          return;
        } else if (opts.maxBytes !== void 0 && buffers.length + chunk.length > opts.maxBytes) {
          settled = true;
          req.destroy();
          reject(new Error(`Request download maximum size exceeded: ${opts.maxBytes} bytes reached`));
          return;
        }
        buffers.push(chunk);
        onMessage(chunk);
      });
      res.on('end', () => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(Buffer.concat(buffers));
      });

    });

  }

  __formatHeaders__ () {

    let headers = {};

    Object.keys(this.parent._headers).forEach(k => headers[k] = this.parent._headers[k]);
    Object.keys(this._headers).forEach(k => headers[k] = this._headers[k]);

    return headers;

  }

  __serverSentEventHandler__ (SSE, chunk, streamListener, expectJSON) {
    if (SSE.enabled) {
      let entries;
      if (chunk) {
        SSE.processing = Buffer.concat([SSE.processing, chunk]);
        entries = SSE.processing.toString().replace(/\r\n/gi, '\n').split('\n\n');
        let lastEntry = entries.pop();
        SSE.processing = Buffer.from(lastEntry);
      } else {
        entries = SSE.processing.toString().replace(/\r\n/gi, '\n').split('\n\n');
      }
      entries
        .filter(entry => !!entry)
        .forEach(entry => {
          let event = 'message';
          let data = '';
          let id = null;
          let foundData = false;
          let lines = entry.split('\n').map((line, i) => {
            let lineData = line.split(':');
            let type = lineData[0];
            let contents = lineData.slice(1).join(':');
            if (contents[0] === ' ') {
              contents = contents.slice(1);
            }
            if (type === 'event' && !foundData) {
              event = contents;
              foundData = true;
            } else if (type === 'data') {
              data = (data ? (data + '\n') : '') + contents;
              foundData = true;
            } else if (type === 'id' && !id) {
              id = contents;
            }
          });
          if (expectJSON) {
            try {
              data = JSON.parse(data);
            } catch (e) {
              // do nothing
            }
          }
          let eventData = {event, data, id};
          SSE.events[event] = SSE.events[event] || [];
          SSE.events[event].push(eventData);
          streamListener(eventData);
        });
    }
  }

  async __request__ (expectJSON, method, id, params, data, streamListener, options) {

    streamListener = typeof streamListener === 'function'
      ? streamListener
      : () => {};

    options = typeof options === 'object'
      ? options || {}
      : {};
    let timeout = (options.hasOwnProperty('timeout') && typeof options.timeout === 'number')
      ? Math.min(Math.max(options.timeout, -1), 600_000)
      : void 0;
    let connectTimeout = (options.hasOwnProperty('connectTimeout') && typeof options.connectTimeout === 'number')
      ? Math.min(Math.max(options.connectTimeout, 0), 600_000)
      : void 0;
    let maxBytes = (options.hasOwnProperty('maxBytes') && typeof options.maxBytes === 'number')
      ? Math.min(Math.max(options.maxBytes, 0), 1_024 * 1_024 * 1_024) // 1GB
      : void 0;
    const opts = { timeout, connectTimeout, maxBytes };

    params = this.parent.serialize(params, true);

    let path = this.path;
    let headers = this.__formatHeaders__();

    if (data && typeof data === 'object' && !(data instanceof Buffer)) {
      try {
        if (data.hasOwnProperty('__serialize__')) {
          delete data.__serialize__;
          data = this.parent.serialize(data);
          headers['Content-Type'] = 'application/x-www-form-urlencoded';
        } else {
          data = JSON.stringify(data);
          headers['Content-Type'] = 'application/json; charset=utf-8';
        }
      } catch (e) {
        // do nothing
      }
    }

    let url = `${path}${id ? '/' + id : ''}`;
    if (url.includes('?')) {
      url = url.endsWith('?') ? `${url}${params}` : `${url}&${params}`;
    } else {
      url = `${url}?${params}`;
    }

    let startTime = new Date().valueOf();
    let { req, res } = await this.__send__(method, url, headers, data, opts);
    const SSE = {
      enabled: (
        res.headers['content-type'] &&
        res.headers['content-type'].split(';')[0] === 'text/event-stream'
      ),
      events: {},
      processing: Buffer.from([])
    };

    let buffers = [];

    return new Promise((resolve, reject) => {

      let settled = false;

      res.on('data', chunk => {
        if (settled) {
          return;
        }
        if (opts.timeout !== void 0 && new Date().valueOf() - startTime > opts.timeout) {
          settled = true;
          req.destroy();
          reject(new Error(`Request download timed out: ${opts.timeout}ms reached`));
          return;
        } else if (opts.maxBytes !== void 0 && buffers.length + chunk.length > opts.maxBytes) {
          settled = true;
          req.destroy();
          reject(new Error(`Request download maximum size exceeded: ${opts.maxBytes} bytes reached`));
          return;
        }
        this.__serverSentEventHandler__(SSE, chunk, streamListener, expectJSON);
        buffers.push(chunk);
      });

      res.on('end', () => {

        if (settled) {
          return;
        }
        settled = true;

        this.__serverSentEventHandler__(SSE, null, streamListener, expectJSON);

        let body = Buffer.concat(buffers);
        let json = null;

        if (expectJSON || (res.headers['content-type'] || '').split(';')[0] === 'application/json') {
          if (SSE.enabled) {
            json = {events: SSE.events};
          } else {
            if (res.statusCode === 204 && body.byteLength === 0) {
              return resolve({
                body: body,
                headers: res.headers,
                statusCode: res.statusCode
              });
            }
            let str = body.toString();
            try {
              json = JSON.parse(str);
            } catch (e) {
              return reject(new Error(['Expecting JSON, invalid response:', str].join('\n')));
            }
          }
        }

        return resolve({
          json: json,
          body: body,
          headers: res.headers,
          statusCode: res.statusCode
        });

      });
    });

  }

  async __send__(method, url, headers, data, opts) {

    const params = {
      headers: headers,
      host: this.parent.host,
      method: method,
      port: this.parent.port,
      path: url,
      timeout: opts.connectTimeout
    };

    if (opts.connectTimeout !== void 0) {
      params.timeout = opts.connectTimeout;
    }

    let settled = false;

    return new Promise((resolve, reject) => {
      const req = (this.parent.ssl ? https : http).request(
        params,
        res => {
          settled = true;
          resolve({ req, res })
        }
      );
      if (opts.connectTimeout !== void 0) {
        req.on('timeout', () => {
          if (settled) {
            return;
          }
          settled = true;
          req.destroy();
          reject(new Error(`Request connection timed out: ${opts.connectTimeout}ms reached`));
          return;
        });
      }
      req.on('error', (err) => {
        if (settled) {
          return;
        }
        settled = true;
        reject(new Error(`Server unavailable: ${method} ${this.parent.host}:${this.parent.port}${url}`));
      });
      req.on('close', () => {
        if (settled) {
          return;
        }
        settled = true;
      });
      req.end(
        method === 'POST' || method === 'PUT' || method === 'PATCH'
        ? data || null
        : null
      );
    });

  }

}

class APIResource {

  constructor (host, port, ssl) {

    host = host || '';

    if (host.indexOf('https://') === 0) {
      host = host.substr(8);
      port = parseInt(port) || 443;
      ssl = true;
    } else if (host.indexOf('http://') === 0) {
      host = host.substr(7);
      port = parseInt(port) || 80;
      ssl = false;
    } else {
      port = parseInt(port) || 443;
      ssl = false;
    }

    if (port === 443) {
      ssl = true;
    }

    if (host.split(':').length > 1) {
      let split = host.split(':');
      host = split[0];
      port = parseInt(split[1]);
    }

    this.host = host;
    this.port = port;
    this.ssl = ssl;
    this._headers = {};

  }

  authorize (accessToken) {
    if (accessToken.startsWith('Bearer ') || accessToken.startsWith('Basic ')) {
      this._headers.Authorization = accessToken;
    } else {
      this._headers.Authorization = `Bearer ${accessToken}`;
    }
    return this;
  }

  __convert__ (keys, isArray, v) {
    isArray = ['', '[]'][isArray | 0];
    return (keys.length < 2) ? (
      [keys[0], isArray, '=', v].join('')
    ) : (
      [keys[0], '[' + keys.slice(1).join(']['), ']', isArray, '=', v].join('')
    );
  }

  __serialize__ (obj, keys, key, i) {

    keys = keys.concat([key]);
    let datum = obj;

    keys.forEach(key => datum = datum[key]);

    if (datum instanceof Date) {

      datum = [datum.getFullYear(), datum.getMonth() + 1, datum.getDate()].join('-');

    }

    if (datum instanceof Array) {

      return datum.map(fnConvert.bind(null, keys, true)).join('&');

    } else if (typeof datum === 'object' && datum !== null) {

      return Object.keys(datum).map(this.__serialize__.bind(null, obj, keys)).join('&');

    }

    return this.__convert__(keys, false, datum);

  }

  serialize (obj, URIEncoded) {

    obj = obj || {};

    let newObj = {};
    Object.keys(obj).forEach(k => {
      let value = obj[k];
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      }
      newObj[k] = URIEncoded ? encodeURIComponent(value) : value
    });

    return Object.keys(newObj).map(this.__serialize__.bind(this, newObj, [])).join('&');

  }

  request (path) {

    return new APIResourceRequest(this, path);

  }

}

module.exports = APIResource;
