require('dotenv').load();
var admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.cert(require('./firebase-keys.json')),
  databaseURL: process.env.FIREBASE_DB_URL
});

var uid = 'node-new-freshbooks-tests';
admin.auth().createCustomToken(uid)
  .then(function(token) {
    var config = {
      apiKey: process.env.FIREBASE_API_KEY,
      databaseURL: process.env.FIREBASE_DB_URL
    };
    console.log(token);

  })
  .catch(function(error) {
    callback(new Error(error.message));
  });
