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
          // we have modifications in threex.domevents.js
          // "https://raw.githubusercontent.com/jeromeetienne/threex.domevents/master/threex.domevents.js",
          "http://threejs.org/examples/js/controls/OrbitControls.js",
          "http://mrdoob.github.io/three.js/examples/js/loaders/ColladaLoader.js",
          "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/js/effects/VREffect.js",
          "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/js/controls/VRControls.js"
        ],
        dest: 'vendor/three/'
      }
    },

    shell: {
      updateAce: {
        command: 'rm -rf src{,-min}-noconflict; '
               + 'tar -xf master.tar.gz; mv ace-builds-master/src{,-min}-noconflict .; '
               + 'rm -rf ace-builds-master master.tar.gz',
        options: {execOptions: {cwd: 'vendor/ace/'}}
      },
      updateTHREE: {
        command: 'mkdir -p examples/three/; mv vendor/three/{ColladaLoader,OrbitControls,VREffect,VRControls}.js examples/three/'
      },
      runTests: {
        command: '<%= pkg.scripts.test %>',
        options: {execOptions: {}}
      }
    },
  });

  grunt.registerTask('test', ['jshint', 'mochaTest']);
  grunt.registerTask('updateAce', ['curl-dir:updateAce', 'shell:updateAce']);
  grunt.registerTask('updateTHREE', ['curl-dir:updateTHREE', 'shell:updateTHREE']);
  grunt.registerTask('updateLibs', ['updateAce', 'updateTHREE']);
  // grunt.registerTask('build', ['curl-dir', 'responsive_images', 'autoprefixer', 'concat', 'uglify', 'jade', 'copy']);
};
