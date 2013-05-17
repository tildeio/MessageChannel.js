module.exports = function(grunt) {
  // Alias tasks for the most common sets of tasks.
  // Most of the time, you will use these.

  // By default, (i.e., if you invoke `grunt` without arguments), do
  // a new build.
  this.registerTask('default', ['server']);

  // Run a server. This is ideal for running the QUnit tests in the browser.
  this.registerTask('server', ['connect', 'watch']);

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    connect: {
      main: {
        options: {
          port: 8000,
          base: '.'
        }
      },

      parentFrame: {
        options: {
          port: 8001,
          base: '.'
        }
      },

      childFrame: {
        options: {
          port: 8002,
          base: '.'
        }
      }
    },

    watch: {
      files: ['lib/**', 'vendor/*', 'test/tests/*'],
      tasks: []
    }
  });

  // Load tasks from npm
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-watch');
};
