# FreshBooks API Client

[![Build Status](https://travis-ci.org/CSNW/node-new-freshbooks.svg?branch=master)](https://travis-ci.org/CSNW/node-new-freshbooks)

Node.js client that wraps a subset of FreshBooks "new" JSON API.

The [tests](https://travis-ci.org/CSNW/node-new-freshbooks) are run daily on Travis; they test FreshBooks' API as well this library, so that we know immediately if there has been a breaking API change.

## Authentication

Your application will need to register a callback webhook with FreshBooks. This webhook is called every time a user gives your app permission to access FreshBooks and is passed a unique code.

Once you have this code, your app should call `getTokens()` with it and the client id/secret pair that you received when you registered your application with FreshBooks:

```javascript
var FreshBooks = require('new-freshbooks');
  
FreshBooks.getTokens(client_id, client_secret, code, function(err, access_token, refresh_token) {
  if (err) throw err;

  // use tokens to intialize a new FreshBooks object & use it to access the API
});
``` 

These access & refresh tokens should then be stored and re-used by your application every time you need to hit the API on behalf of this user.

To test the authentication process without a webhook callback, you can manually get an auth code by navigating to the authorize link listed on https://my.freshbooks.com/#/developer in a browser.

## Initialization

Now that you have authentication tokens, you can create a new instance of the FreshBooks object (each FreshBooks object is user-specific):

```javascript
var freshbooks = new FreshBooks(access_token, refresh_token);
```

## Getting Info about the User

`me()` will return an object with data about the user. The tests verify that the API returns the following properties:

* `id` (Number)
* `first_name` (String)
* `last_name` (String)
* `email` (String)

```javascript
freshbooks.me(function(err, me) {
  if (err) throw err;

  // me -> {id: 249724, first_name: "John", last_name: "Doe", email: "john@company.com"}
});
```

The `me()` method also adds two convenience properties, both arrays of Numbers:

* `business_ids`
* `active_business_ids`

These are derived from data deeper in the data structure returned by the FreshBooks API.

## Getting Projects for a User's Business

To get a list of projects for a user, call `getProjects(business_id, callback)`:

```javascript
var business_id = me.business_ids[0];
freshbooks.getProjects(business_id, function(err, projects, meta) {
  if (err) throw err;

  // do something with projects array
});
```

The tests guarantee that the array returned by the FreshBooks API consists of objects that includes the following properties (and types):

* `id` (Number)
* `title` (String)
* `updated_at` (String)
* `active` (Boolean)

It also guarantees that the meta object includes the following properties for paging through data when there are too many records for FreshBooks to return them all in a single response:

* `pages` (Number)
* `page` (Number)

## Time Entry Creation, Deletion & Listing

Time entries can be created, deleted and listed via the following methods:

### pushTimeEntry(business_id, payload, function(err, result) { })

```javascript
freshbooks.pushTimeEntry(business_id, {
  time_entry: {
      is_logged: true,
      duration: 720,
      note: 'Stuff',
      started_at: '2018-02-14T20:00:00.000Z'
  }
}, function(err, result) {
  if (err) throw err;

  // result.time_entry.id is the id (a Number) assigned to the record by FreshBooks
});
```

### removeTimeEntry(business_id, time_entry_id, function(err, response) { })

```javascript
freshbooks.removeTimeEntry(biz_id, time_entry_id, function(err, res) {
  if (err) throw err;

  // `res` is a String ("Success" if the deletion was successful)
});
```

### listTimeEntries(business_id, function(err, result) { })

```javascript
freshbooks.listTimeEntries(biz_id, function(err, result) {
  if (err) throw err;

  // `result.time_entries` is an array of objects with (at least) `id`, `duration` & `started_at` properties
});
```

## Example

Here is an example that incorporates many of the above functions:

```javascript
  var FreshBooks = require('new-freshbooks');
  
  var client_id = process.env.FBOOKS_CLIENT_ID;
  var client_secret = process.env.FBOOKS_CLIENT_SECRET;
  var code = process.env.FBOOKS_CODE;

  // tokens are meant to be retrieved only once, after manually getting an auth code via
  // navigating to the authorize link listed on https://my.freshbooks.com/#/developer in a browser
  FreshBooks.getTokens(client_id, client_secret, code, function(err, access_token, refresh_token) {
    if (err) throw err;

    // once you have tokens for a user, they should be saved & re-used
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
