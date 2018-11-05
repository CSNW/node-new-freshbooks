var request = require('request');
var _ = require('underscore');

function FreshBooks(access_token, refresh_token) {
  if (!access_token || !refresh_token)
    throw new Error('Missing access_token and/or refresh_token: (' + access_token + ', ' + refresh_token + ')');

  this.access_token = access_token;
  this.refresh_token = refresh_token;
}

FreshBooks.prototype.me = function(opts, callback) {
  if (!callback) {
    callback = opts;
    opts = {};
  }

  this._get('auth/api/v1/users/me', function(err, data) {
    if (err) return callback(err);

    var me = data.response;
    if (!opts.raw)
      me = this._processMe(me);

    callback(null, me);
  }.bind(this));
};

FreshBooks.prototype._processMe = function(me) {
  var required_props = ['id', 'first_name', 'last_name', 'email'];
  var business_ids = me.business_memberships.map(function(biz_membership) {
    return biz_membership.business.id;
  });
  var active_business_ids = _(me.business_memberships).filter(function(biz_membership) {
    return me.subscription_statuses[biz_membership.business.account_id] == 'active';
  }).map(function(biz_membership) {
    return biz_membership.business.id;
  });

  me = _.pick(me, required_props);
  me.business_ids = business_ids;
  me.active_business_ids = active_business_ids;
  return me;
};

FreshBooks.prototype.getProjects = function(business_id, page, callback) {
  if (!callback) {
    callback = page;
    page = 1;
  }
  
  this._get(`projects/business/${business_id}/projects?page=${page}&per_page=100`, function(err, data) {
    if (err) return callback(err);

    callback(null, data.projects, data.meta);
  });
};

FreshBooks.prototype.pushTimeEntry = function(business_id, data, callback) {
  this._post(`timetracking/business/${business_id}/time_entries`, data, callback);
}

FreshBooks.prototype.listTimeEntries = function(business_id, page, callback) {
  if (!callback) {
    callback = page;
    page = 1;
  }

  this._get(`timetracking/business/${business_id}/time_entries?page=${page}&per_page=100`, callback);
}

FreshBooks.prototype.removeTimeEntry = function(business_id, time_entry_id, callback) {
  this._delete(`timetracking/business/${business_id}/time_entries/${time_entry_id}`, callback);
}

FreshBooks.prototype._parseErrorResponse = function(res) {
  var body = res.body;
  return 'HTTP Error ' + res.statusCode + ': ' + (typeof body == 'string' ? body : JSON.stringify(body));
}

FreshBooks.prototype._delete = function(url, callback) {
  this._request({url: url, method: 'delete'}, function(err, res, body) {
    if (err)
      return callback(err);
    else if (!err && !(res.statusCode >= 200 && res.statusCode < 300))
      return callback(new Error(this._parseErrorResponse(res)));
    else
      return callback(null, 'Success');
  }.bind(this));
}

FreshBooks.prototype._get = function(url, callback) {
  this._request({url: url}, function(err, res, body) {
    if (err)
      return callback(err);
    else if (!err && !(res.statusCode >= 200 && res.statusCode < 300))
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
    else if (!err && !(res.statusCode >= 200 && res.statusCode < 300))
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
    redirect_uri: 'https://localhost:8081/fbooks-callback'
  };

  request({uri: auth_url, headers: headers, method: 'POST', body: JSON.stringify(data)}, function(err, res, body) {
    if (!err && !(res.statusCode >= 200 && res.statusCode < 300))
      err = new Error('HTTP Error ' + res.statusCode + ': ' + body);
    if (err)
      return callback(err);

    var tokens = JSON.parse(body);

    callback(null, tokens.access_token, tokens.refresh_token);
  });
};

module.exports = FreshBooks;
