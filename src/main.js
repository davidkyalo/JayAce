/*global require*/

// Require define
define = require('node-requirejs-define');

//Configure define using the same configuration as requestsjs.
define.config({
  baseUrl: __dirname,
//   paths: {
//     'app': './app',
//     'jayace': './jayace/jayace'
//   }
});

// require('node-requirejs-define');
require('./extend-js');
require('./exceptions');
