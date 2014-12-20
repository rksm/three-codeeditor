module.exports = function(grunt) {
  // run with
  //   nodemon -w Gruntfile.js -x grunt dev

  require('load-grunt-tasks')(grunt);

  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    // -=-=-=-=-
    // js tests
    // -=-=-=-=-
    jshint: {
      files: ['Gruntfile.js', 'index.js', 'lib/**/*.js', 'tests/**/*.js'],
      options: {
        laxbreak: true,
        globals: {console: true, module: true, document: true}
      }
    },

    // -=-=-=-=-=-=-=-=-=-
    // fetching resources
    // -=-=-=-=-=-=-=-=-=-
    curl: {
      'update-lively.lang': {
        src: 'https://raw.githubusercontent.com/LivelyKernel/lively.lang/master/lively.lang.dev.js',
        dest: 'vendor/lively.lang.dev.js'
      }
    },

    'curl-dir': {
      'update-ace': {
        src: ['https://github.com/ajaxorg/ace-builds/archive/master.tar.gz'],
        dest: 'vendor/ace/'
      }
    },

    shell: {
      'update-ace': {
        command: 'rm -rf src{,-min}-noconflict; '
               + 'tar -xf master.tar.gz; mv ace-builds-master/src{,-min}-noconflict .; '
               + 'rm -rf ace-builds-master master.tar.gz',
        options: {execOptions: {cwd: 'vendor/ace/'}}
      },
      runTests: {
        command: '<%= pkg.scripts.test %>',
        options: {execOptions: {}}
      }
    },

    // -=-=-=-=-=-=-=-
    // build bundles
    // -=-=-=-=-=-=-=-
    concat: {
      options: {sourceMap: true, sourceMapStyle: 'link', separator: ';\n'},
      "codeeditor3d.dev-bundle.js": {
        src: ["vendor/ace/src-noconflict/ace.js",
              "lively.lang.dev.js",
              "index.js",
              "lib/ace-helper.js",
              "lib/canvas2d.js",
              "lib/domevents.js",
              "lib/raycasting.js",
              "lib/mouseevents.js",
              "lib/rendering.js"],
        dest: "codeeditor3d.dev-bundle.js"
      }
    },

    uglify: {
      "codeeditor3d.min-bundle.js": {
        options: {
          sourceMap: true,
          banner: '/*! <%= pkg.name %>-v<%= pkg.version %> '
                + '<%= grunt.template.today("yyyy-mm-dd") %> */\n'
        },
        files: {"codeeditor3d.min-bundle.js": "codeeditor3d.dev-bundle.js"}
      }
    }

  });

  grunt.registerTask('test', ['jshint', 'shell:runTests']);
  grunt.registerTask('update-ace', ['curl-dir:update-ace', 'shell:update-ace']);
  grunt.registerTask('update-lively.lang', ['curl:update-lively.lang']);
  grunt.registerTask('updateLibs', ['update-ace', 'update-lively.lang']);
  grunt.registerTask('build', ['concat:codeeditor3d.dev-bundle.js']);
  
};
