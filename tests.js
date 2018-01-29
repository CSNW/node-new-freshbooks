require('dotenv').load();
var FreshBooks = require('./freshbooks.js');
var assert = require('chai').assert;

describe('FreshBooks Client', function() {
  var freshbooks;
  before(function() {
    var access_token = process.env.FBOOKS_ACCESS_TOKEN;
    var refresh_token = process.env.FBOOKS_REFRESH_TOKEN;
    if (!access_token || !refresh_token)
      throw new Error('Required environment variables FBOOKS_ACCESS_TOKEN and/or FBOOKS_REFRESH_TOKEN were not populated');

    freshbooks = new FreshBooks(access_token, refresh_token);
  });

  it('should get the current user data', function(done) {
    freshbooks.me(function(err, me) {
      if (err) return done(err);
      console.log(JSON.stringify(me));
      done();
    });
  });

  it('should get the projects for a business', function(done) {
    freshbooks.me(function(err, me) {
      if (err) return done(err);
      var biz_id = me.business_ids[0];
      freshbooks.getProjects(biz_id, function(err, projects) {
        if (err) return done(err);
        done();
      });
    });
  });

  // it('should connect & authorize successfully', function(done) {
  //   var client_id = process.env.FBOOKS_CLIENT_ID;
  //   var client_secret = process.env.FBOOKS_CLIENT_SECRET;
  //   var code = process.env.FBOOKS_CODE;
  //   if (!client_id || !client_secret || !code)
  //     throw new Error('Required environment variables FBOOKS_CLIENT_ID, FBOOKS_CLIENT_SECRET, FBOOKS_CODE were not populated');

  //   freshbooks.getTokens(client_id, client_secret, code, done);
  // });
});
