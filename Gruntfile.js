module.exports = function(grunt) {
    var unsupportedBrowsers = [{
          browserName: 'firefox',
          version: '21',
          platform: 'Windows 8'
        }, {
          browserName: 'internet explorer',
          version: '9',
          platform: 'Windows 7'
        },{
          browserName: 'internet explorer',
          version: '8',
          platform: 'Windows XP'
        }],
        supportedBrowsers = [{
          browserName: 'chrome',
          version: '27',
          platform: 'Windows 8'
        },{
          browserName: 'internet explorer',
          version: '10',
          platform: 'Windows 8'
        },{
          browserName: 'safari',
          version: '6',
          platform: 'OS X 10.8'
        }],
        browsers = unsupportedBrowsers.concat( supportedBrowsers );
  // Alias tasks for the most common sets of tasks.
  // Most of the time, you will use these.

  // By default, (i.e., if you invoke `grunt` without arguments), do
  // start servers for test.
  this.registerTask('default', ['server']);

  // Run a server. This is ideal for running the QUnit tests in the browser.
  this.registerTask('server', ['connect', 'watch']);

  // Run a server and communicate with Saucelabs
  grunt.registerTask('test', "Run full test suite", ['connect', 'saucelabs-qunit:all']);

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    connect: {
      options: {
        hostname: '*',
        base: '.'
      },

      main: {
        options: {
          port: 8000
        }
      },

      parentFrame: {
        options: {
          port: 8001
        }
      },

      childFrame: {
        options: {
          port: 8003
        }
      }
    },

    watch: {
      files: ['lib/**', 'vendor/*', 'tests/tests/*'],
      tasks: ['jshint']
    },

    jshint: {
      options: {
        jshintrc: './.jshintrc'
      },
      all: ['Gruntfile.js', 'lib/**/*.js', 'tests/tests/**/*.js']
    },

    'saucelabs-qunit': {
      options: {
        urls: [
          'http://localhost:8000/tests/index.html'
        ],
        tunnelTimeout: 5,
        /*global process */
        build: process.env.TRAVIS_BUILD_NUMBER,
        concurrency: 3,
        testTimeout: 60 * 1000,
        testInterval: 5000
      },

      all: {
        options: {
          browsers: browsers,
          testname: "MessageChannel.js qunit tests"
        }
      },

      unsupported: {
        options: {
          browsers: unsupportedBrowsers,
          testname: "MessageChannel.js qunit tests (unsupported only)"
        }
      },

      supported: {
        options: {
          browsers: supportedBrowsers,
          testname: "MessageChannel.js qunit tests (supported only)"
        }
      }
    }
  });

  // Load tasks from npm
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-saucelabs');
};
