require('dotenv').load();

var chai = require('chai');
var fs = require('fs');
var FreshBooks = require('./freshbooks.js');
var request = require('request');

describe('fresbooks', function() {
  this.timeout(1000 * 20);

  var token;
  var freshbooks;
  it('should get an access token correctly', function(done) {
    var code = fs.readFileSync('code.txt').toString();
    request({
      method: 'POST',
      url: process.env.token_url,
      headers: {
        'content-type': 'application/json',
        'Api-Version': 'alpha'
      },
      json: {
        grant_type: 'authorization_code',
        client_secret: process.env.client_secret,
        code: code,
        client_id: process.env.client_id,
        redirect_uri: 'https://localhost:8081/fbooks-callback'
      }
    }, function(err, response, body) {
      if (!body.refresh_token) {
        done(new Error(body.error + ' ' + JSON.stringify(body)));
      }
      else {
        freshbooks = new FreshBooks(body.access_token, body.refresh_token);
        done();
      }
    });
  });

  it('should get the current user data', function(done) {
    freshbooks.me(function(err, me) {
      if (err) return done(err);

      chai.assert.ok(me.id);
      done();
    });
  });

  it('should get the projects for a business', function(done) {
    freshbooks.me(function(err, me) {
      if (err) return done(err);
      var biz_id = me.business_ids[0];
      freshbooks.getProjects(biz_id, function(err, projects) {
        if (err) return done(err);

        chai.assert.ok(projects.length);
        chai.assert.ok(projects[0].id);
        done();
      });
    });
  });
});
