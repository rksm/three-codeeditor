;(function(exports) {

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // "imports"
  var AceMouseEvent = ace.require("ace/mouse/mouse_event").MouseEvent;
  var aceEventLib   = ace.require("ace/lib/event");

  var raycastIntersectionToDomXY = THREE.htmlConverter.raycastIntersectionToDomXY;
  var convertToBrowserCoords     = THREE.htmlConverter.convertToBrowserCoords;
  var pickingRay                 = THREE.htmlConverter.pickingRay;
  var pickObjFromDOMEvent        = THREE.htmlConverter.pickObjFromDOMEvent;

  var isFirefox = !!navigator.userAgent.match(/Firefox\//);

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // "exports"
  exports.addMouseEventListener = addMouseEventListener;
  exports.isLeftMouseButtonPressed = (function() {
      return isFirefox ?
          function(evt3D) { var evt = evt3D.origDomEvent; return evt.buttons === 1; } :
          function(evt3D) { var evt = evt3D.origDomEvent; return evt.which === 1 || evt.buttons === 1; }
  })();
  exports.isRightMouseButtonPressed = (function() {
      return isFirefox ?
          function(evt3D) { var evt = evt3D.origDomEvent; return evt.which === 3 || evt.buttons === 2; } :
          function(evt3D) { var evt = evt3D.origDomEvent; return evt.which === 3 || evt.buttons === 2 }
  })();

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // implementation

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
    domEvents._projector.pickingRay = pickingRay;
  }

  // THREExDOMEvents.removeEventListener(plane.get(0), 'mousedown', onMouseDown, false)
  function onMouseEvent3D(THREExDOMEvents, codeEditor, clickState, evt) {
    // if (renderState.threeState.orbitControl.enabled) return;
    // tQueryWorld.show(evt.intersect.point);
    // window.LastEvent = evt;

    if (processScrollbarMouseEvent(THREExDOMEvents, codeEditor, clickState, evt)) return true;

    // FIXME -- make sure that evt.intersect.object really is editor!
    var aceCoords = raycastIntersectionToDomXY(evt.intersect, codeEditor.aceEditor.container);
    reemit3DMouseEvent(THREExDOMEvents, evt.origDomEvent, clickState, codeEditor, aceCoords);
  }

  function processScrollbarMouseEvent(THREExDOMEvents, codeEditor, clickState, evt3D) {
    if (evt3D.type !== 'mousedown') return false;
    var scrollbar = codeEditor.getScrollbar(),
        localBrowserPos = convertToBrowserCoords(evt3D.intersect, codeEditor),
        hit = scrollbar.left <= localBrowserPos.x && localBrowserPos.x <= scrollbar.left + scrollbar.width
           && scrollbar.top <= localBrowserPos.y && localBrowserPos.y <= scrollbar.top + scrollbar.height;

    if (!hit) return false;

    codeEditor.aceEditor.focus();
    clickState.scrollbarClickPoint = localBrowserPos;

    var evt = evt3D.origDomEvent;
    var lastMousePosY = evt.layerY || evt.pageY
    var scrollSpeed = codeEditor.scrollSpeed ||  1;

    function releaseScrollbar(evt) {
      evt.stopPropagation();
      clickState.scrollbarClickPoint = null;
      window.removeEventListener('mouseup', releaseScrollbar, false);
      window.removeEventListener('mousemove', moveScrollbar, false);
    }

    function moveScrollbar(evt) {
      evt.stopPropagation();
      var posY = evt.layerY || evt.pageY;
      var MAGIC = 50; // FIXME, this is for zoom = 1, fov = 75
      var scrollSpeed = THREExDOMEvents.camera().position.distanceTo(codeEditor.position) / MAGIC * codeEditor.scrollSpeed;
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
          aceEd.renderer.content);

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

    var chain = lively.lang.chain,
        aceEdEl = aceEd.renderer.content;

    // we patch methods so that we can install method patchers... uuuuha
    aceEd.$mouseHandler.captureMouse = chain(aceEd.$mouseHandler.captureMouse)
      .getOriginal().wrap(function(proceed, evt, mouseMoveHandler) {
        evt.domEvent = retargetDOMEvent(evt.domEvent, convertEventPos3DtoHTML(THREExDOMEvents, evt, aceEdEl, [codeEditor]), aceEdEl);

        mouseMoveHandler = mouseMoveHandler && chain(mouseMoveHandler)
          .getOriginal()
          .wrap(function(proceed, evt) {
            return evt && proceed(
              retargetDOMEvent(evt, convertEventPos3DtoHTML(THREExDOMEvents, evt, aceEdEl, [codeEditor]), aceEdEl));
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
              retargetDOMEvent(evt, convertEventPos3DtoHTML(THREExDOMEvents, evt, aceEdEl, [codeEditor]), aceEdEl));
          }).value();

        releaseCaptureHandler = chain(releaseCaptureHandler)
          .getOriginal()
          .wrap(function(proceed, evt) {
            return evt && proceed(
              retargetDOMEvent(evt, convertEventPos3DtoHTML(THREExDOMEvents, evt, aceEdEl, [codeEditor]), aceEdEl));
          }).value();

        return proceed(el, eventHandler, releaseCaptureHandler);
      }).value();
  }

  function retargetDOMEvent(evt, globalPosForRealEditor, newTargetEl) {
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

  function convertEventPos3DtoHTML(THREExDOMEvents, evt, domElement, sceneObjectsToPickFrom) {
    // THREExDOMEvents._domElement, THREExDOMEvents._camera
    // Take an event targeted to the 3D canvas. Figure out which object in sceneObjectsToPickFrom (Object3Ds) was hit. Convert the coordinates 
    var intersection = pickObjFromDOMEvent(
      retargetDOMEvent(evt, {x: evt.pageX, y: evt.pageY}, THREExDOMEvents._domElement),
      THREExDOMEvents._camera, sceneObjectsToPickFrom);
    return raycastIntersectionToDomXY(intersection, domElement);
  }


})(THREE.CodeEditor.mouseevents || (THREE.CodeEditor.mouseevents = {}));
