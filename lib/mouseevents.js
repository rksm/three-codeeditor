;(function(exports) {

  var AceMouseEvent = ace.require("ace/mouse/mouse_event").MouseEvent;
  var aceEventLib = ace.require("ace/lib/event");

  // FIXME!
  var isFirefox = !!navigator.userAgent.match(/Firefox\//);

  exports.addMouseEventListener = addMouseEventListener;

  var isLeftMouseButtonPressed = (function() {
      return isFirefox ?
          function(evt3D) { var evt = evt3D.origDomEvent; return evt.buttons === 1; } :
          function(evt3D) { var evt = evt3D.origDomEvent; return evt.which === 1 || evt.buttons === 1; }
  })();
  var isRightMouseButtonPressed = (function() {
      return isFirefox ?
          function(evt3D) { var evt = evt3D.origDomEvent; return evt.which === 3 || evt.buttons === 2; } :
          function(evt3D) { var evt = evt3D.origDomEvent; return evt.which === 3 || evt.buttons === 2 }
  })();

  exports.isLeftMouseButtonPressed = isLeftMouseButtonPressed;
  exports.isRightMouseButtonPressed = isRightMouseButtonPressed;

  function addMouseEventListener(THREExDOMEvents, codeEditor) {
    var clickState = {lastClickTime: 0, doubleClickTriggerTime: 500};
    patchTHREExDOMEventInstance(THREExDOMEvents);
    THREExDOMEvents.addEventListener(
      codeEditor, 'mousedown', onMouseEvent3D.bind(null, THREExDOMEvents, codeEditor, clickState), false);
    THREExDOMEvents.addEventListener(
      codeEditor, 'mousemove', onMouseEvent3D.bind(null, THREExDOMEvents, codeEditor, clickState), false);
    THREExDOMEvents.addEventListener(
      codeEditor, 'mousewheel', onMouseEvent3D.bind(null, THREExDOMEvents, codeEditor, clickState), false);
  }

  function patchTHREExDOMEventInstance(domEvents) {
    domEvents.pickObjFromDOMEvent = function(evt, objsToPick) {
      var mouseCoords = this._getRelativeMouseXY(evt),
        	vector	    = new THREE.Vector3(mouseCoords.x, mouseCoords.y, 0.5),
        	ray         = this._projector.pickingRay(vector, this._camera),
        	intersects  = ray.intersectObjects(objsToPick);
    	return intersects[0];
    }
    // see https://github.com/mrdoob/three.js/issues/5587
    domEvents._projector.pickingRay = function( coords, camera ) {
      var raycaster = new THREE.Raycaster();
      // the camera is assumed _not_ to be a child of a transformed object
      if ( camera instanceof THREE.PerspectiveCamera ) {
          raycaster.ray.origin.copy( camera.position );
          raycaster.ray.direction.set( coords.x, coords.y, 0.5 ).unproject( camera ).sub( camera.position ).normalize();
      } else if ( camera instanceof THREE.OrthographicCamera ) {
          raycaster.ray.origin.set( coords.x, coords.y, - 1 ).unproject( camera );
          raycaster.ray.direction.set( 0, 0, - 1 ).transformDirection( camera.matrixWorld );
      } else {
          console.error( 'ERROR: unknown camera type.' );
      }
      return raycaster;
    }
  }

  // THREExDOMEvents.removeEventListener(plane.get(0), 'mousedown', onMouseDown, false)
  function onMouseEvent3D(THREExDOMEvents, codeEditor, clickState, evt) {
    // if (renderState.threeState.orbitControl.enabled) return;
    // tQueryWorld.show(evt.intersect.point);
    // window.LastEvent = evt;
  
    if (processScrollbarMouseEvent(THREExDOMEvents, codeEditor, clickState, evt)) return true;

    // FIXME -- make sure that evt.intersect.object really is editor!
    var aceCoords = codeeditorAceCoordsFromIntersection(evt.intersect, codeEditor.aceEditor);
    reemit3DMouseEvent(THREExDOMEvents, evt.origDomEvent, clickState, codeEditor, aceCoords);
  }

  function processScrollbarMouseEvent(THREExDOMEvents, codeEditor, clickState, evt3D) {
    if (evt3D.type !== 'mousedown') return false;

    var scrollbar = codeEditor.getScrollbar(),
        localBrowserPos = convertToLocalBrowserCoords(evt3D.intersect, codeEditor),
        hit = scrollbar.left <= localBrowserPos.x && localBrowserPos.x <= scrollbar.left + scrollbar.width
           && scrollbar.top <= localBrowserPos.y && localBrowserPos.y <= scrollbar.top + scrollbar.height;

    if (!hit) return false;

    codeEditor.aceEditor.focus();
    clickState.scrollbarClickPoint = localBrowserPos;

    var evt = evt3D.origDomEvent;
    var lastMousePosY = evt.layerY || evt.pageY
    var scrollSpeed = 1.6;

    function releaseScrollbar(evt) {
      evt.stopPropagation();
      clickState.scrollbarClickPoint = null;
      window.removeEventListener('mouseup', releaseScrollbar, false);
      window.removeEventListener('mousemove', moveScrollbar, false);
    }

    function moveScrollbar(evt) {
      evt.stopPropagation();
      var posY = evt.layerY || evt.pageY;
      var yDiff = (posY - lastMousePosY) * scrollSpeed;
      lastMousePosY = posY;
      codeEditor.aceEditor.renderer.scrollBy(0, yDiff);
    }

    window.addEventListener('mouseup', releaseScrollbar, false);
    window.addEventListener('mousemove', moveScrollbar, false);
    return true;
  }

  function reemit3DMouseEvent(THREExDOMEvents, evt, clickState, codeEditor, globalPosForRealEditor) {
    // evt is a DOM event emitted when clicked on the 3D canvas. We patch it up
    // (for coords, target element, etc) and feed this to ace so that the normal ace
    // mouse handlers are invoked.
    // codeEditor is the 3D editor mesh object
  
    var aceEd      = codeEditor.aceEditor,
        type       = evt.type.replace(/^pointer/, "mouse").toLowerCase(),
        fakeEvt    = retargetDOMEvent(
          evt, globalPosForRealEditor,
          aceEd, aceEd.renderer.content);
  
    patchAceEventMethods(THREExDOMEvents, aceEd, codeEditor);
  
    if (type === 'mousedown') {
      if (Date.now()-clickState.lastClickTime <= clickState.doubleClickTriggerTime) {
        aceEd._emit("dblclick", new AceMouseEvent(fakeEvt, aceEd));
      }
      clickState.lastClickTime = Date.now();
    }

    if (type === 'mousedown') aceEd.$mouseHandler.onMouseEvent("mousedown", fakeEvt)
    else if (type === 'mousemove') aceEd.$mouseHandler.onMouseMove('mousemove', fakeEvt);
    else if ((type === 'mousewheel' || type === 'wheel') && aceEd.isFocused()) aceEd.$mouseHandler.onMouseWheel('mousewheel', fakeEvt);
    else aceEd._emit(type, new AceMouseEvent(fakeEvt, aceEd));

    // Is this really necessary?
    if (type === "mousedown") {
        if (!aceEd.isFocused() && aceEd.textInput)
            aceEd.textInput.moveToMouse(new AceMouseEvent(evt, aceEd));
        aceEd.focus();
    }

  }

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // event conversion
  // -=-=-=-=-=-=-=-=-=-

  function patchAceEventMethods(THREExDOMEvents, aceEd, codeEditor) {
    // ace internally installs new event handler when the mosue is clicked, which
    // e.g. track mouse moves and such. The events coming in are emitted from the 3D
    // environment and actually don't target the ace editor. We install patch
    // functions that will adapt the events so that they make sense for ace
  
    var chain = lively.lang.chain;
  
    // we patch methods so that we can install method patchers... uuuuha
    aceEd.$mouseHandler.captureMouse = chain(aceEd.$mouseHandler.captureMouse)
      .getOriginal().wrap(function(proceed, evt, mouseMoveHandler) {
        evt.domEvent = retargetDOMEvent(evt.domEvent,
          convertEventPos3DtoHTML(THREExDOMEvents, evt.domEvent, aceEd, codeEditor),
          aceEd, aceEd.renderer.content);
  
        mouseMoveHandler = mouseMoveHandler && chain(mouseMoveHandler)
          .getOriginal()
          .wrap(function(proceed, evt) {
            return evt && proceed(
              retargetDOMEvent(evt,
                convertEventPos3DtoHTML(THREExDOMEvents, evt, aceEd, codeEditor),
                aceEd, aceEd.renderer.content));
          }).value();
        return proceed(evt, mouseMoveHandler);
      }).value();
  
    aceEventLib.capture = chain(aceEventLib.capture)
      .getOriginal().wrap(function(proceed, el, eventHandler, releaseCaptureHandler) {
        if (aceEd.container !== el) return proceed(el, eventHandler, releaseCaptureHandler);
        eventHandler = chain(eventHandler)
          .getOriginal()
          .wrap(function(proceed, evt) {
            return evt && proceed(
              retargetDOMEvent(evt,
                convertEventPos3DtoHTML(THREExDOMEvents, evt, aceEd, codeEditor),
                aceEd, aceEd.renderer.content));
          }).value();
  
        releaseCaptureHandler = chain(releaseCaptureHandler)
          .getOriginal()
          .wrap(function(proceed, evt) {
            return evt && proceed(
              retargetDOMEvent(evt,
                convertEventPos3DtoHTML(THREExDOMEvents, evt, aceEd, codeEditor),
                aceEd, aceEd.renderer.content));
          }).value();
  
        return proceed(el, eventHandler, releaseCaptureHandler);
      }).value();
  }
  
  function retargetDOMEvent(evt, globalPosForRealEditor, aceEd, newTargetEl) {
    globalPosForRealEditor = globalPosForRealEditor || {x:0, y:0};
    if (evt.hasCodeEditor3DPatch) return evt;
  
    var x = globalPosForRealEditor.x,
        y = globalPosForRealEditor.y,
        fakeEvt = Object.create(evt)

    if (isFirefox) { // Firefox throws errors when we try to access the inherited attributes...
      // https://developer.mozilla.org/en-US/docs/Web/API/UIEvent
      Object.defineProperty(fakeEvt, "detail",        {value: evt.detail});
      Object.defineProperty(fakeEvt, "view",          {value: evt.view});
      // https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent
      Object.defineProperty(fakeEvt, "altKey",        {value: evt.altKey});
      Object.defineProperty(fakeEvt, "button",        {value: evt.button});
      Object.defineProperty(fakeEvt, "buttons",       {value: evt.buttons});
      // Object.defineProperty(fakeEvt, "clientX",       {value: evt.clientX});
      // Object.defineProperty(fakeEvt, "clientY",       {value: evt.clientY});
      Object.defineProperty(fakeEvt, "ctrlKey",       {value: evt.ctrlKey});
      Object.defineProperty(fakeEvt, "metaKey",       {value: evt.metaKey});
      Object.defineProperty(fakeEvt, "movementX",     {value: evt.movementX});
      Object.defineProperty(fakeEvt, "movementY",     {value: evt.movementY});
      Object.defineProperty(fakeEvt, "relatedTarget", {value: evt.relatedTarget});
      // Object.defineProperty(fakeEvt, "screenX",       {value: evt.screenX});
      // Object.defineProperty(fakeEvt, "screenY",       {value: evt.screenY});
      Object.defineProperty(fakeEvt, "shiftKey",      {value: evt.shiftKey});
      Object.defineProperty(fakeEvt, "which",         {value: evt.which});

      Object.defineProperty(fakeEvt, "eventPhase",    {value: evt.eventPhase});
      Object.defineProperty(fakeEvt, "bubbles",       {value: evt.bubbles});
      Object.defineProperty(fakeEvt, "cancelable",    {value: evt.cancelable});
      Object.defineProperty(fakeEvt, "timeStamp",     {value: evt.timeStamp});
    }

    Object.defineProperty(fakeEvt, "pageX",                {value: x});
    Object.defineProperty(fakeEvt, "pageY",                {value: y});
    Object.defineProperty(fakeEvt, "clientX",              {value: x});
    Object.defineProperty(fakeEvt, "clientY",              {value: y});
    Object.defineProperty(fakeEvt, "x",                    {value: x});
    Object.defineProperty(fakeEvt, "y",                    {value: y});
    Object.defineProperty(fakeEvt, "layerX",               {value: x});
    Object.defineProperty(fakeEvt, "layerY",               {value: y});
    Object.defineProperty(fakeEvt, "target",               {value: newTargetEl});
    // Object.defineProperty(fakeEvt, "currentTarget", {value: evt.currentTarget});
    Object.defineProperty(fakeEvt, "srcElement",           {value: newTargetEl});
    Object.defineProperty(fakeEvt, "hasCodeEditor3DPatch", {value: true});
    Object.defineProperty(fakeEvt, "preventDefault",       {value: function() { evt.preventDefault(); }});
    Object.defineProperty(fakeEvt, "stopPropagation",       {value: function() { evt.stopPropagation(); }});
    Object.defineProperty(fakeEvt, "type",                 {value: evt.type});

    if (evt.type === 'mousewheel' || evt.type === 'wheel') patchWheelEvent(evt, fakeEvt);
    // if (evt.type === 'mousewheel') console.log("%s,%s", fakeEvt.wheelX, fakeEvt.wheelY);

    return fakeEvt;
  }

  var patchWheelEvent = (function() {
    var el = document.body;
    if ("onmousewheel" in el) {
      return function(origEvt, fakeEvt) {
        var factor = 8;
        if (origEvt.wheelDeltaX !== undefined) {
          fakeEvt.wheelX = -origEvt.wheelDeltaX / factor;
          fakeEvt.wheelY = -origEvt.wheelDeltaY / factor;
        } else {
          fakeEvt.wheelX = 0;
          fakeEvt.wheelY = -origEvt.wheelDelta / factor;
        }
      }
    } else if ("onwheel" in el) {
      return function(origEvt, fakeEvt) {
        var factor = 0.35;
        switch (origEvt.deltaMode) {
          case origEvt.DOM_DELTA_PIXEL:
            fakeEvt.wheelX = origEvt.deltaX * factor || 0;
            fakeEvt.wheelY = origEvt.deltaY * factor || 0;
              break;
          case origEvt.DOM_DELTA_LINE:
          case origEvt.DOM_DELTA_PAGE:
            fakeEvt.wheelX = (origEvt.deltaX || 0) * 5;
            fakeEvt.wheelY = (origEvt.deltaY || 0) * 5;
              break;
        }
      }
    } else {
      return function(origEvt, fakeEvt) {
        if (origEvt.axis && origEvt.axis == origEvt.HORIZONTAL_AXIS) {
          fakeEvt.wheelX = (origEvt.detail || 0) * 5;
          fakeEvt.wheelY = 0;
        } else {
          fakeEvt.wheelX = 0;
          fakeEvt.wheelY = (origEvt.detail || 0) * 5;
        }
      }
    }
  })();


  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // mapping of scene positions
  // -=-=-=-=-=-=-=-=-=-=-=-=-=-

  function convertEventPos3DtoHTML(THREExDOMEvents, evt, aceEd, codeEditor) {
    var intersection = THREExDOMEvents.pickObjFromDOMEvent(
      retargetDOMEvent(evt, {x: evt.pageX, y: evt.pageY}, aceEd, THREExDOMEvents._domElement),
      [codeEditor], THREExDOMEvents._camera);
    return codeeditorAceCoordsFromIntersection(intersection, aceEd);
  }
  
  function codeeditorAceCoordsFromIntersection(intersection, aceEd) {
    if (!intersection) return null;
    var localCoords = convertToLocalBrowserCoords(intersection, intersection.object);
    var aceCoords = {
      x: aceEd.container.offsetLeft + localCoords.x,
      y: aceEd.container.offsetTop + localCoords.y
    }
    return aceCoords;
  }
  
  function convertToLocalBrowserCoords(intersection, object) {
    var cache = intersection.cachedLocalBrowserCoords || (intersection.cachedLocalBrowserCoords = {});
    if (cache[object.uuid]) return cache[object.uuid];
    object.geometry.computeBoundingBox()
    var worldPoint          = intersection.point,
        size                = object.geometry.boundingBox.size(),
        worldCenter         = object.position.clone().add(object.geometry.boundingBox.center()),
        localTopLeft        = object.worldToLocal(worldCenter).add(size.multiply(new THREE.Vector3(.5,-.5,.5))),
        localEvt            = object.worldToLocal(worldPoint.clone()),
        browserLocalTopLeft = localTopLeft.clone().add(localEvt).multiply(new THREE.Vector3(1,-1,1))
    return cache[object.uuid] = browserLocalTopLeft;
  }

})(THREE.CodeEditor.mouseevents || (THREE.CodeEditor.mouseevents = {}));
