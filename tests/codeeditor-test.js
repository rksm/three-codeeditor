/*global beforeEach, afterEach, describe, it, setTimeout, createThreeWorld*/

var expect = this.chai.expect || module.require('chai').expect;
var THREE = this.THREE;

// -=-=-=-
// helper
// -=-=-=-

function saveCodeEditorCanvas(codeEditor, name) {
  name = lively.lang.date.format(new Date(), "yy-mm-dd_HH:MM:ss")
    + name.replace(/\s/g, '_') + ".png";
  var canvas = codeEditor.material.map.image;
  downloadURI(canvas.toDataURL(), name);
}

function downloadURI(uri, name) {
  var link = document.createElement("a");
  link.download = name;
  link.href = uri;
  link.click();
}

// -=-=-=-
// tests
// -=-=-=-

describe('three-codeeditor', function() {

  this.timeout(4000);

  it('renders text', function(done) {
    var testName = this.test.fullTitle();
    createThreeWorld(document.body, function(err, world) {

      var THREExDOMEvents = new THREEx.DomEvents(world.camera, world.renderer.domElement);
      var codeEditor = new THREE.CodeEditor(world.renderer.domElement, THREExDOMEvents);

      world.scene.add(codeEditor);
      codeEditor.setValue("test");

      // some time to have the rendering finished
      setTimeout(function() { saveCodeEditorCanvas(codeEditor, testName); }, 60);

      setTimeout(function() {
        codeEditor.destroy();
        world.uninstall(done);
      }, 3000);
    });
  });

});

