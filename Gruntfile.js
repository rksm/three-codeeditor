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
    'curl-dir': {
      'updateAce': {
        src: ['https://github.com/ajaxorg/ace-builds/archive/master.tar.gz'],
        dest: 'vendor/ace/'
      }
    },

    shell: {
      updateAce: {
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
  grunt.registerTask('updateAce', ['curl-dir:updateAce', 'shell:updateAce']);
  grunt.registerTask('updateLibs', ['updateAce']);
  grunt.registerTask('build', ['concat:codeeditor3d.dev-bundle.js']);
  
};
