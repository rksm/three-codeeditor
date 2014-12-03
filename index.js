/*global THREE,ace*/

;(function() {

  THREE.CodeEditor = function(canvas3dElement, THREExDOMEvents) {

    // "imports"
    var aceHelper    = THREE.CodeEditor.aceHelper,
        rendering    = THREE.CodeEditor.rendering,
        canvas2d     = THREE.CodeEditor.canvas2d,
        mouseevents  = THREE.CodeEditor.mouseevents;

    this.THREExDOMEvents = THREExDOMEvents;
  
    var width = 400, height = 400;
    var editorGeo = plane(
      new THREE.Vector3(-width/2, height/2,0),
      new THREE.Vector3( width/2, height/2,0),
      new THREE.Vector3( width/2,-height/2,0),
      new THREE.Vector3(-width/2,-height/2,0));
  
    // building the html canvas that will be used as a texture
    var canvas = this.canvas2d = canvas2d.create(width, height),
        texture	= new THREE.Texture(canvas),
        material= new THREE.MeshBasicMaterial({
          color: "white", map: texture,
          side: THREE.DoubleSide});
  
    THREE.Mesh.call(this, editorGeo, material);
  
    editorGeo.computeBoundingBox();
    this.position.copy(editorGeo.boundingBox.center());
  
    // creating the ace editor instance that will work behind the scenes as our "model"
    var aceEditor  = this.aceEditor = aceHelper.createAceEditor(
      canvas3dElement.offsetLeft, canvas3dElement.offsetTop, width, height);
    aceEditor.renderer.on("afterRender",
      rendering.onAceEditorAfterRenderEvent.bind(null, aceEditor, this));

    // input event setup
    mouseevents.addMouseEventListener(THREExDOMEvents, this);
  
    texture.needsUpdate	= true;
  };
  
  THREE.CodeEditor.prototype = Object.create(THREE.Mesh.prototype);
  
  (function() {
  
    this.isCodeEditor3D = true;
  
    this.setValue = function(text) {
      this.aceEditor.setValue(text);
    };
  
    this.destroy = function() {
      // FIXME remove mouse handler...
      this.canvas2d.cleanup();
      this.canvas2d = null;
      this.aceEditor.cleanup();
      this.aceEditor = null;
    };

  }).call(THREE.CodeEditor.prototype);
  
  
  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // helper
  // -=-=-=-
  
  function notYetImplemented() { console.warn("NOT YET IMPLEMENTED"); }
  
  function plane(a,b,c,d) {
    var vec1 = b.clone().sub(a), vec2 = d.clone().sub(a);
    return new THREE.PlaneGeometry(vec1.length(), vec2.length(), 10,10);
  }

})(THREE, ace);
