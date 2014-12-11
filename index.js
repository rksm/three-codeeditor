/*global THREE,ace*/

;(function() {

    // "imports"
  var aceHelper, rendering, canvas2d, domevents,
      mouseevents, commands, htmlTHREEConversion;
  // "imports" assigned here b/c they are first available after this module got defined
  function imports() {
    aceHelper           = THREE.CodeEditor.aceHelper,
    rendering           = THREE.CodeEditor.rendering,
    canvas2d            = THREE.CodeEditor.canvas2d,
    mouseevents         = THREE.CodeEditor.mouseevents;
    domevents           = THREE.CodeEditor.domevents;
    commands            = THREE.CodeEditor.commands;
    htmlTHREEConversion = THREE.CodeEditor["html-three-conversion"];
  }

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

  if (!THREE.CodeEditor) {
    THREE.CodeEditor = function CodeEditor() { this.initialize.apply(this, arguments); }
    THREE.CodeEditor.prototype = Object.create(THREE.Mesh.prototype);
  } else imports();

  (function() {

    this.isCodeEditor3D = true;

    // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    // initialize-release
    // -=-=-=-=-=-=-=-=-=-

    this.initialize = function(canvas3dElement, THREExDOMEvents) {
      imports();

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
      var aceEditor = this.aceEditor = aceHelper.createAceEditor(
        canvas3dElement.offsetLeft, canvas3dElement.offsetTop, width, height);
      var self = this;
      aceEditor.renderer.on("afterRender", function() { rendering.onAceEditorAfterRenderEvent(aceEditor, self); });
      aceEditor.renderer.on("themeChange", function() { self.invalidateScrollbar(); });
      aceEditor.renderer.on("resize",      function() { self.invalidateScrollbar(); });
      aceEditor.renderer.on("autosize",    function() { self.invalidateScrollbar(); });
    
      texture.needsUpdate	= true;
    
      this.addMouseEventListeners();
    
      // command setup
      commands.javascript.forEach(function(cmd) {
        aceEditor.commands.addCommand(cmd); });
      var occurStartCommand = ace.require("ace/commands/occur_commands").occurStartCommand;
      aceEditor.commands.addCommand(occurStartCommand);
      aceEditor.setOption("useIncrementalSearch", true);
    }

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

    this.scrollSpeed = 1;
    
    this.addMouseEventListeners = function() {
      mouseevents.patchTHREExDOMEventInstance(this.THREExDOMEvents);
      if (this._onMouseDown || this._onMouseMove || this._onMouseWheel) this.removeMouseEventListeners();

      this._onMouseDown  = function(evt) { return this.onMouseDown(evt); }.bind(this);
      this._onMouseMove  = function(evt) { return this.onMouseMove(evt); }.bind(this);
      this._onMouseWheel = function(evt) { return this.onMouseWheel(evt); }.bind(this);
      this.THREExDOMEvents.addEventListener(this, 'mousedown', this._onMouseDown, false);
      this.THREExDOMEvents.addEventListener(this, 'mousemove', this._onMouseMove, false);
      this.THREExDOMEvents.addEventListener(this, 'mousewheel', this._onMouseWheel, false);
    }

    this.removeMouseEventListeners = function() {
      this._onMouseDown &&  this.THREExDOMEvents.removeEventListener(this, 'mousedown', this._onMouseDown, false);
      this._onMouseMove &&  this.THREExDOMEvents.removeEventListener(this, 'mousemove', this._onMouseMove, false);
      this._onMouseWheel && this.THREExDOMEvents.removeEventListener(this, 'mousewheel', this._onMouseWheel, false);
      this._onMouseDown = null;
      this._onMouseMove = null;
      this._onMouseWheel = null;
    }

    this.onMouseDown = function(evt) {
      // clicked on scrollbar?
      if (mouseevents.processScrollbarMouseEvent(
          this.THREExDOMEvents, this, this.clickState, evt)) return true;

      var aceCoords = htmlTHREEConversion.raycastIntersectionToDomXY(evt.intersect, this.aceEditor.container);
      mouseevents.reemit3DMouseEvent(this.THREExDOMEvents, evt.origDomEvent, this.clickState, this, aceCoords);
    }

    this.onMouseMove = function(evt) {
      var aceCoords = htmlTHREEConversion.raycastIntersectionToDomXY(evt.intersect, this.aceEditor.container);
      mouseevents.reemit3DMouseEvent(this.THREExDOMEvents, evt.origDomEvent, this.clickState, this, aceCoords);
    }

    this.onMouseWheel = function(evt) {
      var aceCoords = htmlTHREEConversion.raycastIntersectionToDomXY(evt.intersect, this.aceEditor.container);
      mouseevents.reemit3DMouseEvent(this.THREExDOMEvents, evt.origDomEvent, this.clickState, this, aceCoords);
    }

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

    // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    // geometry
    // -=-=-=-=-

    this.getWidth = function() { return this.getSize().x; };
    this.getHeight = function() { return this.getSize().y; };

    this.setHeight = function(height) { return this.setSize(this.getWidth(), height); };
    this.setWidth = function(width) { return this.setSize(width, this.getHeight()); };

    this.getSize = function() {
      this.geometry.computeBoundingBox();
      return this.geometry.boundingBox.size();
    };

    this.setSize = function(width, height) {
      this.aceEditor.container.style.width = width + "px";
      this.aceEditor.container.style.height = height + "px";
      this.canvas2d.width = width;
      this.canvas2d.height = height;
      this.geometry.vertices = [
        new THREE.Vector3(-width/2, height/2,0),
        new THREE.Vector3( width/2, height/2,0),
        new THREE.Vector3(-width/2,-height/2,0),
        new THREE.Vector3( width/2,-height/2,0)]

      this.material.map.needsUpdate = true;
      this.aceEditor.resize(true);
      this.geometry.verticesNeedUpdate = true;
      // for events:
      this.geometry.computeBoundingBox();
      this.geometry.computeBoundingSphere();
    };

    this.getGlobalVertice = function(i) {
      return this.geometry.vertices[i].clone().applyMatrix4(this.matrixWorld);
    };

    this.topLeft = function() { return this.getGlobalVertice(0); };
    this.topRight = function() { return this.getGlobalVertice(1); };
    this.bottomLeft = function() { return this.getGlobalVertice(2); };
    this.bottomRight = function() { return this.getGlobalVertice(3); };

    // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    // positioning
    // -=-=-=-=-=-=-
    this.alignWithCamera = function(leftRightOrCenter, camera) {
      // offset: // -1 left, 0 center, 1 right
      this.geometry.computeBoundingBox()
      var margin = 50;
      var size = this.geometry.boundingBox.size()
      var dist = (size.y+margin) / 2 / Math.tan(Math.PI * camera.fov / 360);
    	var center = htmlTHREEConversion.pickingRay({x:0,y:0}, camera).ray.at(dist);

      this.position.copy(center);
      this.lookAt(camera.position);
      
    // 	var projectionPoint = htmlTHREEConversion.pickingRay({x:-1,y:0}, camera).ray.at(dist);
    // 	var delta = projectionPoint.clone().sub(center);
    //   align(this, this.topLeft(), projectionPoint)
    //   this.position.copy(projectionPoint.clone());
    //   this.lookAt(camera.position.clone().add(delta));
    //   this.position.add(this.topRight().clone().sub(this.topLeft()).multiplyScalar(.5));
    //   return;

      // move the editor to the left side until it reaches the screen border...
      // ugly! I should use fov and stuff to compute the coordinates but its soooo late already.... :P
      camera.updateMatrix()
      camera.updateMatrixWorld()
      var delta = camera.up.clone().cross(this.position.clone().sub(camera.position)).normalize()
      var frustum = new THREE.Frustum();
      frustum.setFromMatrix( new THREE.Matrix4().multiply( camera.projectionMatrix, camera.matrixWorldInverse ) );
      var bounds = new THREE.Box3().setFromObject(this);
      do { // move left unti we "hit" the corner of the editor
        this.position.add(delta);
        this.updateMatrixWorld();
      } while (frustum.containsPoint(this.topLeft()) && frustum.containsPoint(this.bottomLeft()))

    }

  }).call(THREE.CodeEditor.prototype);


  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // helper
  // -=-=-=-

  function align(object, x, y) { return object.position.add(y.clone().sub(x)); }

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

})(THREE);
