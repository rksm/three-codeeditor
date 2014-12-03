/*global THREE*/

THREE.CodeEditor = function() {

  var width = 400, height = 400;
  var editorGeo = plane(
    new THREE.Vector3(-width/2, height/2,0),
    new THREE.Vector3( width/2, height/2,0),
    new THREE.Vector3( width/2,-height/2,0),
    new THREE.Vector3(-width/2,-height/2,0));


  var canvas = canvasEditorInterface.create();
  var texture	= new THREE.Texture(canvas);
  var material= new THREE.MeshBasicMaterial({
    color: "white", map: texture, side: THREE.DoubleSide})

  THREE.Mesh.call(this, editorGeo, material);

  editorGeo.computeBoundingBox();
  this.position.copy(editorGeo.boundingBox.center());

  texture.needsUpdate	= true;

};

THREE.CodeEditor.prototype = Object.create(THREE.Mesh.prototype);

(function() {

  this.isCodeEditor3D = true;

  this.setValue = notYetImplemented;

}).call(THREE.CodeEditor.prototype);


// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// helper
// -=-=-=-

function notYetImplemented() { console.warn("NOT YET IMPLEMENTED"); }

function plane(a,b,c,d) {
  var vec1 = b.clone().sub(a), vec2 = d.clone().sub(a);
  return new THREE.PlaneGeometry(vec1.length(), vec2.length(), 10,10);
}

function createCanvas() {

  var canvas = state.canvasEditor = canvasEditorInterface.create();
  var c = canvas.getContext("2d");
  
  c.textBaseline = 'top';
  
  // c.fillStyle = "#FFFFFF"
  // c.fillRect(0,0, canvas.width, canvas.height);
}

var canvasEditorInterface = {

  editorElements: canvasEditorInterface ? canvasEditorInterface.editorElements : [],

  create: function() {
    var el = document.createElement("canvas");
    document.body.appendChild(el);
    el.width = 400;
    el.height = 400;
    el.style.width = "400px"
    el.style.height = "400px";
    el.style.left = "400px"
    el.style.position = "absolute";
    canvasEditorInterface.editorElements.push(el);
    var c = el.getContext("2d");
    c.textBaseline = 'top';
    
    // c.fillRect(0,0,el.width,el.height);
    c.fillStyle = "#666666"
    c.fillStyle = "green";
    c.fillRect(0,0,el.width,el.height);
    c.fillStyle = "#EEE"
    c.fillText("hello!!!!", 0, 20);

    return el;
  },

  cleanup: function() {
    canvasEditorInterface.editorElements.forEach(function(el) {
      el.parentNode.removeChild(el); });
    canvasEditorInterface.editorElements.length = 0;;
  }

}
