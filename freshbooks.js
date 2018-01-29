var request = require('request');
var _ = require('underscore');

function FreshBooks(access_token, refresh_token) {
  if (!access_token || !refresh_token)
    throw new Error('Missing access_token and/or refresh_token: (' + access_token + ', ' + refresh_token + ')');

  this.access_token = access_token;
  this.refresh_token = refresh_token;
}

FreshBooks.prototype.me = function(callback) {
  this._request('auth/api/v1/users/me', null, function(err, data) {
    if (err) return callback(err);

    var me = data.response;
    var required_props = ['id', 'first_name', 'last_name', 'email'];
    required_props.forEach(function(prop) {
      if (!(prop in me))
        throw new Error('Required property "' + prop + '" not found in /me: ' + JSON.stringify(me));
      
      var expected_type = prop == 'id' ? 'number' : 'string';
      if (typeof me[prop] != expected_type)
        throw new Error('me.' + prop + ' is not a ' + expected_type + ': ' + JSON.stringify(me[prop]));
    });

    if (!me.business_memberships || !_.isArray(me.business_memberships))
      throw new Error('Expected me.business_memberships to be an array: ' + JSON.stringify(me.business_memberships));

    var business_ids = me.business_memberships.map(function(biz_membership) {
      if (!biz_membership.business || !_.isObject(biz_membership.business))
        throw new Error('Expected me.business_memberships to have a .business object: ' + JSON.stringify(biz_membership));

      if (typeof biz_membership.business.id != 'number')
        throw new Error('Expected me.business_memberships.business.id to be a number: ' + JSON.stringify(biz_membership.business));

      return biz_membership.business.id;
    });

    var me = _.pick(me, required_props);
    me.business_ids = business_ids;

    callback(null, me);
  });
};

FreshBooks.prototype.getProjects = function(business_id, callback) {
  this._request(`projects/business/${business_id}/projects`, null, function(err, data) {
    if (err) return callback(err);

    // TODO: support data.meta.pages > 1
    var projects = data.projects.map(function(proj) {
      if (typeof proj.id != 'number')
        throw new Error('Expected project to have a numeric id: ' + JSON.stringify(proj));
      if (typeof proj.title != 'string')
        throw new Error('Expected project to have a title: ' + JSON.stringify(proj));
      return {id: proj.id, title: proj.title};
    });

    callback(null, projects);
  });
};

FreshBooks.prototype._request = function(path, data, callback) {
  var headers = {
    'Authorization': `Bearer ${this.access_token}`,
    'Api-Version': 'alpha'
  };

  // only add Content-Type application/json if we're sending JSON
  // if we add it when we're not sending any data, the API responds with
  // HTTP 400: The browser (or proxy) sent a request that this server could not understand.
  if (data)
    headers['Content-Type'] = 'application/json';

  request('https://api.freshbooks.com/' + path, {headers: headers}, function(err, res, body) {
    if (!err && res.statusCode != 200)
      err = new Error('HTTP Error ' + res.statusCode + ': ' + body);
    if (err)
      return callback(err);

    try {
      body = JSON.parse(body)
    }
    catch(err) {
      return callback(new Error('Unable to parse JSON: ' + body));
    }

    callback(null, body);
  });
};

FreshBooks.getTokens = function(client_id, client_secret, code, callback) {
  var auth_url = `https://api.freshbooks.com/auth/oauth/token`;
  var headers = {
    'Api-Version': 'alpha',
    'Content-Type': 'application/json'
  };
  var data = {
    grant_type: 'authorization_code',
    client_id: client_id,
    client_secret: client_secret,
    code: code,
    redirect_uri: "https://localhost:8081/fbooks-callback"
  };

  request({uri: auth_url, headers: headers, method: 'POST', body: JSON.stringify(data)}, function(err, res, body) {
    if (!err && res.statusCode != 200)
      err = new Error('HTTP Error ' + res.statusCode + ': ' + body);
    if (err)
      return callback(err);

    var tokens = JSON.parse(body);

    callback(null, tokens.access_token, tokens.refresh_token);
  });
};

module.exports = FreshBooks;
