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
    aceEditor.renderer.on("themeChange", this.invalidateScrollbar.bind(this));
    aceEditor.renderer.on("resize", this.invalidateScrollbar.bind(this));
    aceEditor.renderer.on("autosize", this.invalidateScrollbar.bind(this));

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

    this.toggleFocusAndBlurOnMouseOverAndOut = function() {
      if (this._focusOnOver) {
        var method = "removeEventListener";
      } else {
        method = "addEventListener";
        this._focusOnOver = function(evt) {
          var evts = THREE.CodeEditor.mouseevents;
          if (!evts.isLeftMouseButtonPressed(evt) && !evts.isRightMouseButtonPressed(evt))
            this.aceEditor.focus();
        }.bind(this);
        this._blurOnOut = function(evt) { this.aceEditor.blur(); }.bind(this);
      }
      this.THREExDOMEvents[method](this, "mouseover", this._focusOnOver, false);
      this.THREExDOMEvents[method](this, "mouseout", this._blurOnOut, false);
    }

    this.getScrollbar = function() {
      return this.scrollbar || (this.scrollbar = createScrollbar(this.aceEditor));
    }

    this.invalidateScrollbar = function(codeEditor) { codeEditor.scrollbar = null; }

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

  function createScrollbar(aceEditor) {
    var renderer       = aceEditor.renderer, scrollBarV = renderer.scrollBarV,
        editorStyle    = window.getComputedStyle(renderer.container),
        relativeHeight = scrollBarV.element.clientHeight / scrollBarV.inner.clientHeight,
        relativeTop    = scrollBarV.scrollTop / scrollBarV.inner.clientHeight,
        height         = scrollBarV.element.clientHeight,
        borderWidth    = 3,
        width          = 10,
        col            = new THREE.Color(editorStyle.backgroundColor),
        isDarkTheme = (col.r+col.g+col.b)/3 < .5,
        backgroundColor = col.clone().add(col.clone().multiplyScalar(-.4)).getStyle();

    return {
        height: height * relativeHeight - borderWidth,
        width: width - borderWidth,
        get top() { return height * (scrollBarV.scrollTop / scrollBarV.inner.clientHeight) + borderWidth; },
        left: renderer.container.clientWidth - width - borderWidth,
        borderWidth: borderWidth,
        backgroundColor: backgroundColor,
        borderColor: isDarkTheme ? col.add(new THREE.Color('white').multiplyScalar(.2)).getStyle() : backgroundColor,
        borderRounding: 4
      };
  }

})(THREE, ace);
