'use strict';
module.exports = function(grunt) {

  var config;

  config = {
    sass: 'scss',
    css: 'css',
    js: 'js',
    scripts: 'scripts'
  };

  // Project configuration.
  grunt.initConfig({
    config: config,
    pkg: grunt.file.readJSON('package.json'),
    sass: {
      dev: {
        options: {
          style: 'expanded',
          sourcemap: 'none'
        },
        files: {
          '<%= config.css %>/trellisto-styles.css': '<%= config.sass %>/trellisto.scss'
        }
      },
      prod: {
        options: {
          style: 'compressed',
          sourcemap: 'none'
        },
        files: {
          '<%= config.css %>/trellisto-styles.css': '<%= config.sass %>/trellisto.scss'
        }
      }
    },
    concat: {
      options: {
        separator: ';',
      },
      dist: {
        src: ['<%= config.js %>/lib/jquery-2.1.4.min.js',
              '<%= config.js %>/main.js'],
        dest: '<%= config.scripts %>/trellisto-scripts.js'
      }
    },
    uglify: {
      dist: {
        files: {
          '<%= config.scripts %>/trellisto-scripts.js': ['<%= config.js %>/lib/jquery-2.1.4.min.js',
                                                         '<%= config.js %>/main.js']
        }
      }
    },
    watch: {
      stylesheets: {
        files: ['<%= config.sass %>/**/*.{sass,scss,css}'],
        tasks: ['sass:dev']
      },
      js: {
        files: ['<%= config.js %>/lib/jquery-2.1.4.min.js',
                '<%= config.js %>/main.js'],
        tasks: ['concat']
      }
    },
  });

  // Load tasks
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-contrib-watch');

  // Default Task
  grunt.registerTask('default', [
    'watch'
  ]);

  // Task list for production build
  grunt.registerTask('build-production', [
    'sass:prod',
    'uglify'
  ]);

};