var request = require('request');
var _ = require('underscore');

function FreshBooks(access_token, refresh_token) {
  if (!access_token || !refresh_token)
    throw new Error('Missing access_token and/or refresh_token: (' + access_token + ', ' + refresh_token + ')');

  this.access_token = access_token;
  this.refresh_token = refresh_token;
}

FreshBooks.prototype.me = function(callback) {
  this._get('auth/api/v1/users/me', function(err, data) {
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
  this._get(`projects/business/${business_id}/projects`, function(err, data) {
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

FreshBooks.prototype.pushTimeEntry = function(business_id, data, callback) {
  this._post(`timetracking/business/${business_id}/time_entries`, data, callback);
}

FreshBooks.prototype.listTimeEntries = function(business_id, callback) {
  this._get(`timetracking/business/${business_id}/time_entries`, callback);
}

FreshBooks.prototype.removeTimeEntry = function(business_id, time_entry_id, callback) {
  this._delete(`timetracking/business/${business_id}/time_entries/${time_entry_id}`, callback);
}

FreshBooks.prototype._parseErrorResponse = function(res) {
  var body = res.body;
  return 'HTTP Error ' + res.statusCode + ': ' + (typeof body == 'string' ? body : JSON.stringify(body));
}

FreshBooks.prototype._isSuccessCode = function(res) {
  var statusCode = res.statusCode.toString();
  return statusCode[0] == '2';
}

FreshBooks.prototype._delete = function(url, callback) {
  this._request({url: url, method: 'delete'}, function(err, res, body) {
    if (err)
      return callback(err);
    else if (!err && !this._isSuccessCode(res))
      return callback(new Error(this._parseErrorResponse(res)));
    else
      return callback(null, 'Success');
  }.bind(this));
}

FreshBooks.prototype._get = function(url, callback) {
  this._request({url: url}, function(err, res, body) {
    if (err)
      return callback(err);
    else if (!err && !this._isSuccessCode(res))
      return callback(new Error(this._parseErrorResponse(res)));
    else
      return callback(null, JSON.parse(body));
  }.bind(this));
}

FreshBooks.prototype._post = function(url, data, callback) {
  this._request({
    url: url,
    method: 'post',
    headers: {
      'content-type': 'application/json'
    },
    json: data
  }, function(err, res, body) {
    if (err)
      return callback(err);
    else if (!err && !this._isSuccessCode(res))
      return callback(new Error(this._parseErrorResponse(res)));
    else
      return callback(null, body);
  }.bind(this));
}

FreshBooks.prototype._request = function(opts, callback) {
  opts.headers = opts.headers || {};
  opts.headers['Authorization'] = 'Bearer ' + this.access_token;
  opts.headers['Api-Version'] = 'alpha';
  opts.url = 'https://api.freshbooks.com/' + opts.url

  request(opts, callback);
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
