exports.config = {
  runner: 'local',
  framework: 'jasmine',
  reporters: ['spec'],
  specs: ['./test/*.test.js'],
  logLevel: 'silent',
  capabilities: [{
    maxInstances: 5,
    browserName: 'firefox',
    'moz:firefoxOptions': {
      args: ['-headless']
    },
    // WDIO_CLASSIC=1 runs the suite in a WebDriver Classic session, so the
    // switchFrame path is tested on webdriverio 9 and 10 (both default to BiDi).
    'wdio:enforceWebDriverClassic': Boolean(process.env.WDIO_CLASSIC)
  }],

  onPrepare() {
    require('geckodriver').start();
  },

  onComplete() {
    require('geckodriver').stop();
  }
};
