const send = require('../helpers/send.js');

/**
* Perform HTTP DELETE request (JSON)
* @param {string} url The URL to make an HTTP(S) request to
* @param {string} authorization HTTP Authorization header value. If "Bearer " or "Basic " prefixes are not included, "Bearer " will be assumed.
* @param {object} headers Custom HTTP request headers
* @param {object} queryParams Parameters sent as part of the HTTP query string
* @param {function} streamListener Callback to stream data to
* @param {object} options Options for the request
* @returns {object} response
* @ {number} statusCode
* @ {object} headers
* @ {object} data
*/
module.exports = async (url, authorization = null, headers = null, queryParams = {}, streamListener = null, options = null) => {

  let result = await send('DELETE', url, queryParams, authorization, headers, {}, null, streamListener, options);
  return {
    statusCode: result.statusCode,
    headers: result.headers,
    data: result.json
  };

};
