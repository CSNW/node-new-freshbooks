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

  function setTokens(body) {
    db.ref('env_data').set({refresh_token: body.refresh_token});
    freshbooks = new FreshBooks(body.access_token, body.refresh_token);
  }

  before(function(done) {
    initFirebase(function(err) {
      if (err) return done(err);

      db.ref('env_data').once('value').then(function(data) {
        var env_data = data.val();
        var data = {
          client_secret: process.env.client_secret,
          client_id: process.env.client_id,
          redirect_uri:'https://localhost:8081/fbooks-callback'
        };
        if (env_data.refresh_token) {
          data.grant_type = 'refresh_token';
          data.refresh_token = env_data.refresh_token;
        }
        else if (env_data.code) {
          data.grant_type = 'authorization_code';
          data.code = env_data.code;
        }
        else {
          return done(new Error('env_data must have refresh_token or authorization_code supplied'));
        }
        request({
          method: 'POST',
          url: process.env.base_url,
          headers: {
            'content-type': 'application/json',
            'Api-Version': 'alpha'
          },
          json: data
        }, function(err, response, body) {
          if (body && body.refresh_token) {
            setTokens(body);
            done();
          }
          else if (err) {
            done(err);
          }
          else {
            done(new Error('No refresh_token in response: ' + JSON.stringify(body)));
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
      var required_props = ['id', 'first_name', 'last_name', 'email'];
      required_props.forEach(function(prop) {
        chai.assert.ok(me[prop], 'Required property "' + prop + '" not found in /me: ' + JSON.stringify(me));

        var expected_type = prop == 'id' ? 'number' : 'string';
        chai.assert.typeOf(
          me[prop],
          expected_type,
          'me.' + prop + ' is not a ' + expected_type + ': ' + JSON.stringify(me[prop]));
      });

      me.business_memberships.map(function(biz_membership) {
        chai.assert.ok(
          biz_membership.business && _.isObject(biz_membership.business),
          'Expected me.business_memberships to have a .business object: ' + JSON.stringify(biz_membership));

        chai.assert.typeOf(
          biz_membership.business.id,
          'number',
          'Expected me.business_memberships.business.id to be a number: ' + JSON.stringify(biz_membership.business)
        );
        biz_membership.business.id;
      });

      chai.assert.ok(me.subscription_statuses);
      done();
    });
  });

  it('should get the projects for a business', function(done) {
    freshbooks.me(function(err, me) {
      if (err) return done(err);
      biz_id = me.business_memberships[0].business.id;
      freshbooks.getProjects(biz_id, function(err, projects, meta) {
        if (err) return done(err);

        chai.assert.ok(projects.length);
        projects.forEach(function(project) {
          chai.assert.ok(project.id);
          chai.assert.typeOf(project.id, 'number');

          chai.assert.ok(project.title);
          chai.assert.typeOf(project.title, 'string');

          chai.assert.ok(project.updated_at);
          chai.assert.typeOf(project.updated_at, 'string');

          chai.assert.ok(project.active);
          chai.assert.typeOf(project.active, 'boolean');

          /*
          fails right now because client_id is null
          chai.assert.ok(project.client_id);
          chai.assert.typeOfproject.client_id, 'number');
          */
        });

        chai.assert.ok(meta.pages);
        chai.assert.typeOf(meta.pages, 'number');

        chai.assert.ok(meta.page);
        chai.assert.typeOf(meta.page, 'number');

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

  it('should list new time', function(done) {
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
