require('dotenv').load();

var _ = require('underscore');
var chai = require('chai');
var firebase = require('firebase');
var fs = require('fs');
var FreshBooks = require('./freshbooks.js');
var request = require('request');



describe('freshbooks', function() {
  this.timeout(1000 * 20);

  var token;
  var freshbooks, db;
  var biz_id, project_id, time_entry_id;

  function initFirebase(callback) {
    var config = {
      apiKey: process.env.FIREBASE_API_KEY,
      databaseURL: process.env.FIREBASE_DB_URL
    };
    firebase.initializeApp(config);
    firebase.auth().signInWithEmailAndPassword(
      process.env.FIREBASE_USERNAME,
      process.env.FIREBASE_PASSWORD
    ).catch(function(error) {
      callback(new Error(error.message));
    }).then(function() {
      db = firebase.database();
      callback();
    });
  }

  function initializeRefreshToken(env_data, done) {
    if (!env_data.code) return done(new Error('process.env.code required but not supplied'));

    var code = env_data.code.trim();
    request({
      method: 'POST',
      url: process.env.base_url,
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
        setTokens(body);
        done();
      }
    });
  }

  function setTokens(body) {
    db.ref('env_data').set({refresh_token: body.refresh_token});
    freshbooks = new FreshBooks(body.access_token, body.refresh_token);
  }

  before(function(done) {
    initFirebase(function(err) {
      if (err) return done(err);

      db.ref('env_data').once('value').then(function(data) {
        var env_data = data.val();
        request({
          method: 'POST',
          url: process.env.token_url,
          headers: {
            'content-type': 'application/json',
            'Api-Version': 'alpha'
          },
          json: {
            grant_type: 'refresh_token',
            client_secret: process.env.client_secret,
            refresh_token: env_data.refresh_token,
            client_id: process.env.client_id,
            redirect_uri:'https://localhost:8081/fbooks-callback'
          }
        }, function(err, response, body) {
          if (!(body || {}).refresh_token) {
            initializeRefreshToken(env_data, done);
          }
          else {
            setTokens(body);
            done();
          }
        });
      });
    });
  });

  after(function(done) {
    firebase.auth().signOut()
     .catch(function (err) {
       firebase.database().goOffline();
       done(new Error(err.message));
     }).then(function() {
       firebase.database().goOffline();
       done();
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
      biz_id = me.business_ids[0];
      freshbooks.getProjects(biz_id, function(err, projects) {
        if (err) return done(err);

        project_id = projects[0].id;
        chai.assert.ok(projects.length);
        chai.assert.ok(projects[0].id);
        done();
      });
    });
  });

  it('should push time correctly', function(done) {
    freshbooks.pushTimeEntry(biz_id, {
      time_entry: {
          is_logged: true,
          duration: 720,
          note: 'Stuff',
          started_at: '2018-02-14T20:00:00.000Z'
      }
    }, function(err, result) {
      if (err) return done(err);

      time_entry_id = result.time_entry.id;
      chai.assert.ok(time_entry_id);
      done();
    });
  });

  it('should list new time ', function(done) {
    freshbooks.listTimeEntries(biz_id, function(err, result) {
      if (err) return done(err);

      var time_entries = result.time_entries;
      chai.assert.ok(time_entries.length);
      var time_entry_ids = _(time_entries).pluck('id');
      chai.assert.notEqual(time_entry_ids.indexOf(time_entry_id), -1);
      done();
    });
  });

  it('should delete time correctly', function(done) {
    freshbooks.removeTimeEntry(biz_id, time_entry_id, function(err, res) {
      if (err) return done(err);

      chai.assert.equal(res, 'Success');
      done();
    });
  });
});
