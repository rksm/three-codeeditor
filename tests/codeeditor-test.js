/*global beforeEach, afterEach, describe, it, setTimeout, createThreeWorld*/

var expect = this.chai.expect || module.require('chai').expect;
var THREE = this.THREE;

// -=-=-=-
// helper
// -=-=-=-

function downloadURI(uri, name) {
  var link = document.createElement("a");
  link.download = name;
  link.href = uri;
  link.click();
}

function saveCodeEditorCanvas(codeEditor, name) {
  name = lively.lang.date.format(new Date(), "yy-mm-dd_HH:MM:ss")
    + name.replace(/\s/g, '_') + ".png";
  var canvas = codeEditor.material.map.image;
  downloadURI(canvas.toDataURL(), name);
  
}

// -=-=-=-
// tests
// -=-=-=-
describe('three-codeeditor', function() {

  this.timeout(4000);

  it('renders', function(done) {
    var testName = this.test.fullTitle();
    createThreeWorld(document.body, function(err, world) {
      var codeEditor = new THREE.CodeEditor();
      world.scene.add(codeEditor);
      codeEditor.position.z = 100;
      codeEditor.setValue("test");
      // saveCodeEditorCanvas(codeEditor, testName);
      setTimeout(function() {
        codeEditor.destroy();
        world.uninstall(done);
      }, 3000);
    });
  });

});

