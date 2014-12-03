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
      files: ['Gruntfile.js', 'lib/**/*.js', 'tests/**/*.js'],
      options: {
        laxbreak: true,
        globals: {console: true, module: true, document: true}
      }
    },

    // concat: {
    //   options: {sourceMap: true, sourceMapStyle: 'link', separator: ';'},
    //   three: {
    //     src: [
    //       "public/js-compiled/three/three.js",
    //       "public/js-compiled/three/tquery.js",
    //       "public/js-compiled/three/tquery.domevent.js",
    //       // "public/js-compiled/three/stats.min.js",
    //       // "public/js-compiled/three/BasicShader.js",
    //       // "public/js-compiled/three/OBJLoader.js",
    //       // "public/js-compiled/three/SceneLoader.js",
    //       // "public/js-compiled/three/Loader.js",
    //       "public/js-compiled/three/OrbitControls.js",
    //       "public/js-compiled/three/VRControls.js",
    //       "public/js-compiled/three/VREffect.js",
    //       // "public/js-compiled/three/threex.videotexture.js",
    //       // "public/js-compiled/three/threex.webcamtexture.js",
    //       "public/js-compiled/three/threex.domevents.js",
    //       // "public/js-compiled/three/helvetiker_regular.typeface.js"
    //     ],
    //     dest: 'public/js-compiled/three/three-combined.js'
    //   }
    // },

    // uglify: {
    //   lib: {
    //     options: {
    //       sourceMap: true,
    //       banner: '/*! <%= pkg.name %>-v<%= pkg.version %> '
    //             + '<%= grunt.template.today("yyyy-mm-dd") %> */\n'
    //     },
    //     files: {'public/js-compiled/all.min.js': ["lib/**/*.js"]}
    //   },
    //   three: {
    //     options: { sourceMap: true, },
    //     files: {'public/js-compiled/three.min.js': ["public/js-compiled/three/three-combined.js"]}
    //   }
    // },

    // -=-=-=-=-=-=-=-=-=-
    // fetching resources
    // -=-=-=-=-=-=-=-=-=-
    'curl-dir': {
      'updateAce': {
        src: ['https://github.com/ajaxorg/ace-builds/archive/master.tar.gz'],
        dest: 'vendor/ace/'
      },
      'updateTHREE': {
        src: [
          "http://threejs.org/build/three.js",
          "http://threejs.org/examples/js/controls/OrbitControls.js",
          "https://raw.githubusercontent.com/jeromeetienne/threex.domevents/master/threex.domevents.js"
        ],
        dest: 'vendor/three/'
      }
    //   'three': {
    //     src: [
    //       // core
    //       "http://threejs.org/build/three.js",
    //       "http://threejs.org/examples/js/libs/stats.min.js",
    //       // shaders
    //       "http://threejs.org/examples/js/shaders/BasicShader.js",
    //       // loaders / exporters
    //       "http://threejs.org/examples/js/loaders/OBJLoader.js",
    //       "http://threejs.org/examples/js/loaders/SceneLoader.js",
    //       "https://raw.githubusercontent.com/mrdoob/three.js/master/editor/js/Loader.js",
    //       // camera control
    //       "http://threejs.org/examples/js/controls/OrbitControls.js",
    //       // vr
    //       "http://lively-web.org/webvr-resources/this-is-my-horse/js/VRControls.js",
    //       "http://lively-web.org/webvr-resources/this-is-my-horse/js/VREffect.js",
    //       // threex
    //       "http://jeromeetienne.github.io/threex.videotexture/threex.videotexture.js",
    //       "http://jeromeetienne.github.io/threex.videotexture/threex.webcamtexture.js",
    //       "https://raw.githubusercontent.com/jeromeetienne/threex.domevents/master/threex.domevents.js",
    //       // font
    //       "http://threejs.org/examples/fonts/helvetiker_regular.typeface.js",
    //       // tquery
    //       "https://raw.githubusercontent.com/jeromeetienne/tquery/master/build/tquery.js",
    //       "https://raw.githubusercontent.com/jeromeetienne/tquery/master/plugins/domevent/tquery.domevent.js"
    //     ],
    //     dest: 'public/js-compiled/three/'
    //   },
    //   'keybindingLib': {
    //     src: [
    //       "https://raw.githubusercontent.com/ccampbell/mousetrap/master/mousetrap.js",
    //       "https://raw.githubusercontent.com/ccampbell/mousetrap/master/mousetrap.min.js"
    //     ],
    //     dest: 'public/js-compiled/browser-helper/'
    //   }
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
  });

  grunt.registerTask('test', ['jshint', 'mochaTest']);
  grunt.registerTask('updateAce', ['curl-dir:updateAce', 'shell:updateAce']);
  grunt.registerTask('updateTHREE', ['curl-dir:updateTHREE']);
  // grunt.registerTask('build', ['curl-dir', 'responsive_images', 'autoprefixer', 'concat', 'uglify', 'jade', 'copy']);
};
