module.exports = function(grunt) {
  // Alias tasks for the most common sets of tasks.
  // Most of the time, you will use these.

  // By default, (i.e., if you invoke `grunt` without arguments), do
  // start servers for test.
  this.registerTask('default', ['server']);

  // Build a new version of the library
  this.registerTask('build', "Builds a distributable version of MessageChannel.js", ['clean', 'jshint', 'transpile', 'copy']);

  // Run a server. This is ideal for running the QUnit tests in the browser.
  this.registerTask('server', ['connect', 'watch']);

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    connect: {
      main: {
        options: {
          hostname: '*',
          port: 8000,
          base: '.'
        }
      },

      parentFrame: {
        options: {
          hostname: '*',
          port: 8001,
          base: '.'
        }
      },

      childFrame: {
        options: {
          hostname: '*',
          port: 8002,
          base: '.'
        }
      }
    },

    clean: ['dist'],

    copy: {
      amd: {
        files: [
          {src: ['tmp/amd/message_channel.js'], dest: 'dist/message_channel.amd.js'}
        ]
      },

      main: {
        files: [
          {src: ['lib/loader.js', 'tmp/browser/message_channel.js'], dest: 'dist/message_channel-<%= pkg.version %>.js'}
        ]
      }
    },

    transpile: {
      amd: {
        type: "amd",
        files: [{
          expand: true,
          cwd: 'lib/',
          src: ['message_channel.js'],
          dest: 'tmp/amd'
        }]
      },

      main: {
        type: "globals",
        imports: {},
        files: [{
          expand: true,
          cwd: 'lib/',
          src: ['message_channel.js'],
          dest: "tmp/browser"
        }]
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
    }
  });

  // Load tasks from npm
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-es6-module-transpiler');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jshint');
};
