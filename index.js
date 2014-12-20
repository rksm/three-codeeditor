/*global THREE,ace*/

;(function() {

    // "imports"
  var aceHelper, rendering, canvas2d, domevents,
      mouseevents, commands, raycasting;
  // "imports" assigned here b/c they are first available after this module got defined
  function imports() {
    aceHelper           = THREE.CodeEditor.aceHelper,
    rendering           = THREE.CodeEditor.rendering,
    canvas2d            = THREE.CodeEditor.canvas2d,
    mouseevents         = THREE.CodeEditor.mouseevents;
    domevents           = THREE.CodeEditor.domevents;
    raycasting          = THREE.CodeEditor.raycasting;
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

    this.initialize = function(options) {
      imports();

      if (!options) throw new Error("No settings specified for CodeEditor3D!");
      if (!options.events) throw new Error("Settings do not specify a THREEx.DomEvents instance!");

      this.events = options.events;

      // supported events: resize
      lively.lang.events.makeEmitter(this);

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
      var aceEditor;
      if (options.aceEditor) this.aceEditor = aceEditor = options.aceEditor;
      else {
        var offset = options.canvasOffset || {left: 0, top: 0};
        aceEditor = this.aceEditor = aceHelper.createAceEditor(
          offset.left, offset.top, width, height);
      }

      aceEditor.parent3d = this; // FIXME backlink for autocompleter

      var self = this;
      aceEditor.renderer.on("afterRender", function() { rendering.onAceEditorAfterRenderEvent(aceEditor, self); });
      aceEditor.renderer.on("themeChange", function() { self.invalidateScrollbar(); });
      aceEditor.renderer.on("resize",      function() { self.invalidateScrollbar(); });
      aceEditor.renderer.on("autosize",    function() { self.invalidateScrollbar(); });

      texture.needsUpdate	= true;

      this.addMouseEventListeners();
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
      mouseevents.patchTHREExDOMEventInstance(this.events);
      if (this._onMouseDown || this._onMouseMove || this._onMouseWheel) this.removeMouseEventListeners();

      this._onMouseDown  = function(evt) { return this.onMouseDown(evt); }.bind(this);
      this._onMouseMove  = function(evt) { return this.onMouseMove(evt); }.bind(this);
      this._onMouseWheel = function(evt) { return this.onMouseWheel(evt); }.bind(this);
      this._onMouseOver = function(evt) {  return this.onMouseOver(evt); }.bind(this);
      this._onMouseOut = function(evt) { return this.onMouseOut(evt); }.bind(this);

      this.events.addEventListener(this, 'mousedown', this._onMouseDown, false);
      this.events.addEventListener(this, 'mousemove', this._onMouseMove, false);
      this.events.addEventListener(this, 'mousewheel', this._onMouseWheel, false);
      this.events.addEventListener(this, 'mouseover', this._onMouseOver, false);
      this.events.addEventListener(this, 'mouseout', this._onMouseOut, false);
    }

    this.removeMouseEventListeners = function() {
      this._onMouseDown  && this.events.removeEventListener(this, 'mousedown', this._onMouseDown, false);
      this._onMouseMove  && this.events.removeEventListener(this, 'mousemove', this._onMouseMove, false);
      this._onMouseWheel && this.events.removeEventListener(this, 'mousewheel', this._onMouseWheel, false);
      this._onMouseOver  && this.events.removeEventListener(this, "mouseover", this._onMouseOver, false);
      this._onMouseOut   && this.events.removeEventListener(this, "mouseout", this._onMouseOut, false);
      this._onMouseDown = null;
      this._onMouseMove = null;
      this._onMouseWheel = null;
      this._onMouseOver = null;
      this._onMouseOut = null;
    }

    this.onMouseDown = function(evt) {
      // clicked on scrollbar?
      if (mouseevents.processScrollbarMouseEvent(
          this.events, this, this.clickState, evt)) return true;

      var aceCoords = raycasting.raycastIntersectionToDomXY(evt.intersect, this.aceEditor.container);
      mouseevents.reemit3DMouseEvent(this.events, evt.origDomEvent, this.clickState, this, aceCoords);
    }

    this.onMouseMove = function(evt) {
      var aceCoords = raycasting.raycastIntersectionToDomXY(evt.intersect, this.aceEditor.container);
      mouseevents.reemit3DMouseEvent(this.events, evt.origDomEvent, this.clickState, this, aceCoords);
    }

    this.onMouseWheel = function(evt) {
      var aceCoords = raycasting.raycastIntersectionToDomXY(evt.intersect, this.aceEditor.container);
      mouseevents.reemit3DMouseEvent(this.events, evt.origDomEvent, this.clickState, this, aceCoords);
    }

    this.onMouseOver = function(evt) {
return;
      if (evt.target !== this) return;
      var noMouse = !mouseevents.isLeftMouseButtonPressed(evt)
                 && !mouseevents.isRightMouseButtonPressed(evt);
      if (noMouse) this.aceEditor.focus();
      if (noMouse) console.log("ficussed!!");
    };

    this.onMouseOut = function(evt) {
return;
      console.log("blur!!");
      this.aceEditor.blur();
    };

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
      this.emit("resize", {x: width, y: height});
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
      var margin = 200;
      var size = this.geometry.boundingBox.size()
      var dist = (size.y+margin) / 2 / Math.tan(Math.PI * camera.fov / 360);
    	var center = raycasting.pickingRay({x:0,y:0}, camera).ray.at(dist);

      this.position.copy(center);
      this.lookAt(camera.position);

      if (leftRightOrCenter === "center") return;
    // 	var projectionPoint = raycasting.pickingRay({x:-1,y:0}, camera).ray.at(dist);
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
      if (leftRightOrCenter === "right") delta.negate();
      var frustum = new THREE.Frustum();
      frustum.setFromMatrix( new THREE.Matrix4().multiply( camera.projectionMatrix, camera.matrixWorldInverse ) );
      var bounds = new THREE.Box3().setFromObject(this);
      do { // move left unti we "hit" the corner of the editor
        this.position.add(delta);
        this.updateMatrixWorld();
        var pointsToCheck = leftRightOrCenter === "right" ?
          [this.topRight(), this.bottomRight()] : [this.topLeft(), this.bottomLeft()]
      } while (pointsToCheck.every(function(p) { return frustum.containsPoint(p); }));

    }

    this.autoAlignWithCamera = function(dir, camera) {
      var cameraState, editorState, editor = this;;

      this.stopAutoAlignWithCamera();

      rememberState();
      editor.alignWithCamera(dir, camera);

      editor._autoAlignWithCameraInterval = setInterval(function() {
        if (!hasCameraChanged() && !hasEditorChanged()) return;
        rememberState();
        lively.lang.fun.debounceNamed("autoAlignWithCamera", 200,
          editor.alignWithCamera.bind(editor, dir, camera))();
      }, 100);

      function rememberState() {
        editorState = {wasResized: false, position: editor.position.clone()};
        editor.once("resize", function() { editorState.wasResized = true; });
        cameraState = lively.lang.obj.extract(
          ["position", "rotation", "fov", "aspect", "zoom"], camera,
          function(k, val) { return val && val.clone ? val.clone() : val; });
      }

      function hasCameraChanged() {
        return Object.keys(cameraState).some(function(k) {
          if (!cameraState[k]) return false;
          if (cameraState[k].equals) return !cameraState[k].equals(camera[k]);
          return cameraState[k] !== camera[k];
        });
      }

      function hasEditorChanged() {
        return editorState.wasResized || !editorState.position.equals(editor.position);
      }
    };

    this.stopAutoAlignWithCamera = function() {
      if (this._autoAlignWithCameraInterval) {
        clearInterval(this._autoAlignWithCameraInterval);
        delete this._autoAlignWithCameraInterval;
      }
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
