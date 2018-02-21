var chai = require('chai');
var fs = require('fs');
describe('fresbooks', function() {
  var timeout = 1000 * 40;
  this.timeout(timeout);

  it('should login & get the authorization url correctly', function() {
    browser.url('https://my.freshbooks.com/#/developer');
    var title = browser.getTitle();
    chai.assert.equal(title, 'FreshBooks');
    browser.waitForVisible('[type="email"]');
    browser.setValue('[type="email"]', process.env.FBOOKS_USERNAME);
    browser.setValue('[type="password"]', process.env.FBOOKS_PASSWORD);
    browser.click('[type="submit"]');
    browser.waitForVisible('.partnerApplication-toggle');
    browser.click('.partnerApplication-toggle');
    browser.waitForVisible('.partnerApplication-uriList a');
    browser.click('.partnerApplication-uriList a');
    const openTabs = browser.getTabIds();
    const currentTab = browser.getCurrentTabId();
    browser.switchTab(openTabs[0]);
    browser.close(openTabs[1]);
    browser.waitForVisible('[type="email"]');
    browser.setValue('[type="email"]', process.env.FBOOKS_USERNAME);
    browser.setValue('[type="password"]', process.env.FBOOKS_PASSWORD);
    browser.click('[type="submit"]');
  });

  it('should download the code correctly', function() {
    if (browser.getUrl().indexOf('?code=') == -1) {
      browser.waitForVisible('.authorize-button', timeout);
      browser.click('.authorize-button');
    }
    var code = /\?code\=(.*)$/.exec(browser.getUrl())[1];
    chai.assert.ok(code);
    fs.writeFileSync('code.txt', code);
  });
});
