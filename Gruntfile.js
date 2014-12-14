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
    }
  });

  grunt.registerTask('test', ['jshint', 'mochaTest']);
  grunt.registerTask('updateAce', ['curl-dir:updateAce', 'shell:updateAce']);
  grunt.registerTask('updateTHREE', ['curl-dir:updateTHREE', 'shell:updateTHREE']);
  grunt.registerTask('updateLibs', ['updateAce', 'updateTHREE']);
};
