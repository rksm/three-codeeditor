/*global THREE,ace*/

;(function() {

    // "imports"
  var aceHelper, rendering, canvas2d, domevents, mouseevents;

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

  THREE.CodeEditor = function(canvas3dElement, THREExDOMEvents) {

    // "imports" assigned here b/c they are first available after this module got defined
    aceHelper    = THREE.CodeEditor.aceHelper,
    rendering    = THREE.CodeEditor.rendering,
    canvas2d     = THREE.CodeEditor.canvas2d,
    mouseevents  = THREE.CodeEditor.mouseevents;
    domevents    = THREE.CodeEditor.domevents;

    // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

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

    // var maxAnisotropy = renderer.getMaxAnisotropy();
		// texture.anisotropy = 16;

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
    this.scrollSpeed = 1;

    texture.needsUpdate	= true;
  };
  
  THREE.CodeEditor.prototype = Object.create(THREE.Mesh.prototype);
  
  (function() {
  
    this.isCodeEditor3D = true;

    // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    // initialize-release
    // -=-=-=-=-=-=-=-=-=-

    this.destroy = function() {
      // FIXME remove mouse handler...
      this.canvas2d.cleanup();
      this.canvas2d = null;
      this.aceEditor.cleanup();
      this.aceEditor = null;
    };

    // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    // editor behavior  
    // -=-=-=-=-=-=-=-=-=-

    this.setValue = function(text) {
      this.aceEditor.setValue(text);
    };
    
    this.insert = function(text, noTransform) {
      // insert text at cursor
      this.aceEditor.insert(text, noTransform);
    };

    // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    // input events
    // -=-=-=-=-=-=-

    this.toggleFocusAndBlurOnMouseOverAndOut = function() {
      if (this._focusOnOver) {
        var method = "removeEventListener";
      } else {
        method = "addEventListener";
        this._focusOnOver = function(evt) {
          if (evt.target !== this) return;
          if (!domevents.isLeftMouseButtonPressed(evt) && !domevents.isRightMouseButtonPressed(evt))
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

    this.invalidateScrollbar = function() { this.scrollbar = null; }

    this.clickState = {
      lastClickTime: 0,
      doubleClickTriggerTime: 500,
      scrollbarClickPoint: null
    };
    
    this.onMouseDown = function(evt) {
      // clicked on scrollbar?
      if (mouseevents.processScrollbarMouseEvent(
          this.THREExDOMEvents, this, this.clickState, evt)) return true;

      var aceCoords = mouseevents.raycastIntersectionToDomXY(evt.intersect, this.aceEditor.container);
      mouseevents.reemit3DMouseEvent(this.THREExDOMEvents, evt.origDomEvent, this.clickState, this, aceCoords);
    }

    this.onMouseMove = function(evt) {
      var aceCoords = mouseevents.raycastIntersectionToDomXY(evt.intersect, this.aceEditor.container);
      mouseevents.reemit3DMouseEvent(this.THREExDOMEvents, evt.origDomEvent, this.clickState, this, aceCoords);
    }

    this.onMouseWheel = function(evt) {
      var aceCoords = mouseevents.raycastIntersectionToDomXY(evt.intersect, this.aceEditor.container);
      mouseevents.reemit3DMouseEvent(this.THREExDOMEvents, evt.origDomEvent, this.clickState, this, aceCoords);
    }

    // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    // geometry
    // -=-=-=-=-

    this.getGlobalVertice = function(i) {
      return this.geometry.vertices[i].clone().applyMatrix4(this.matrixWorld);
    };

    this.topLeft = function() { return this.getGlobalVertice(0); };
    this.topRight = function() { return this.getGlobalVertice(1); };
    this.bottomLeft = function() { return this.getGlobalVertice(2); };
    this.bottomRight = function() { return this.getGlobalVertice(3); };

  }).call(THREE.CodeEditor.prototype);
  
  
  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // helper
  // -=-=-=-
  
  function notYetImplemented() { console.warn("NOT YET IMPLEMENTED"); }
  
  function plane(a,b,c,d) {
    var vec1 = b.clone().sub(a), vec2 = d.clone().sub(a);
    return new THREE.PlaneGeometry(vec1.length(), vec2.length(), 1,1);
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
        isDarkTheme    = (col.r+col.g+col.b)/3 < .5,
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
