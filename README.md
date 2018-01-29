# FreshBooks API Client

Node.js client for the new FreshBooks API.

```javascript
  var FreshBooks = require('new-freshbooks');
  
  var client_id = process.env.FBOOKS_CLIENT_ID;
  var client_secret = process.env.FBOOKS_CLIENT_SECRET;
  var code = process.env.FBOOKS_CODE;

  // tokens are meant to be retrieved only once, after getting an auth code via
  // navigating to an authorize link on https://my.freshbooks.com/#/developer in a browser
  FreshBooks.getTokens(client_id, client_secret, code, function(err, access_token, refresh_token) {
    if (err) throw err;

    // once you have tokens for a user, they should be saved & re-used\
    // whenever you need to use the API on behalf of that user
    var freshbooks = new FreshBooks(access_token, refresh_token);
    freshbooks.me(function(err, me) {
      if (err) throw err;

      var business_id = me.business_ids[0];
      freshbooks.getProjects(business_id, function(err, projects) {
        if (err) throw err;

        projects.forEach(function(project) {
          console.log(project.id, project.title);
        });
      });
    });
  });
```
