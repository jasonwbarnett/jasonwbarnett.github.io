module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    curl: {
      turbolinks: {
        src: 'https://raw.github.com/rails/turbolinks/master/lib/assets/javascripts/turbolinks.js.coffee',
        dest: '_assets/turbolinks.coffee'
      }
    },
    coffee: {
      compile: {
        files: {
          '_assets/turbolinks.coffee.js': '_assets/turbolinks.coffee'
        }
      }
    },
    replace: {
      jqueryGithubFonts: {
        src: ['bower_components/jquery-github/assets/base.css'],
        overwrite: true,
        replacements: [{
          from: 'url(\'Entypo-webfont',
          to: 'url(\'/css/font/Entypo-webfont'
        }]
      }
    },
    concat: {
      dist: {
        src: [
          'bower_components/jquery/jquery.min.js',
          'bower_components/bootstrap/js/transition.js',
          'bower_components/bootstrap/js/collapse.js',
          'bower_components/nprogress/nprogress.js',
          '_assets/turbolinks.coffee.js',
          'bower_components/jquery-github/dist/jquery.github.js',
          '_assets/up.js'
        ],
        dest: 'js/up.min.js'
      }
    },
    uglify: {
      build: {
        src: 'js/up.min.js',
        dest: 'js/up.min.js'
      }
    },
    less: {
      production: {
        options: {
          paths: [
            '_assets/',
            'bower_components/nprogress/',
            'bower_components/bootstrap/less/',
            'bower_components/font-awesome/less/',
            'bower_components/jquery-github/assets/'
          ],
          yuicompress: true
        },
        files: {
          'css/up.css': '_assets/up.less'
        }
      }
    },
    watch: {
      scripts: {
        files: ['_assets/*.js', '_assets/*.coffee'],
        tasks: ['coffee', 'concat', 'uglify'],
        options: {
          spawn: false,
        },
      },
      less: {
        files: ['_assets/*.less', '_assets/*.css'],
        tasks: ['less'],
      },
    },
    copy: {
      main: {
        files: [
          {
            expand: true,
            flatten: true,
            cwd: 'bower_components/font-awesome/fonts/',
            src: '**',
            dest: 'css/font/',
            filter: 'isFile'
          },
          {
            expand: true,
            flatten: true,
            cwd: 'bower_components/jquery-github/assets/',
            src: ['*.eot', '*.svg', '*.ttf', '*.woff'],
            dest: 'css/font/',
            filter: 'isFile'
          }
        ]
      }
    }
  });

  // Load the plugins
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-coffee');
  grunt.loadNpmTasks('grunt-curl');
  grunt.loadNpmTasks('grunt-text-replace');

  // Default task(s).
  grunt.registerTask('default', ['curl', 'replace', 'coffee', 'concat', 'uglify', 'less', 'copy']);
};
