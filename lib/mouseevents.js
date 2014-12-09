;(function(exports) {

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // "imports"
  var AceMouseEvent = ace.require("ace/mouse/mouse_event").MouseEvent;
  var aceEventLib   = ace.require("ace/lib/event");

  var retargetDOMEvent = THREE.CodeEditor["domevents"].retargetDOMEvent;

  var raycastIntersectionToDomXY = THREE.CodeEditor["html-three-conversion"].raycastIntersectionToDomXY;
  var convertToBrowserCoords     = THREE.CodeEditor["html-three-conversion"].convertToBrowserCoords;
  var pickingRay                 = THREE.CodeEditor["html-three-conversion"].pickingRay;
  var pickObjFromDOMEvent        = THREE.CodeEditor["html-three-conversion"].pickObjFromDOMEvent;
  var convertToBrowserCoords     = THREE.CodeEditor["html-three-conversion"].convertToBrowserCoords;
  var convertEventPos3DtoHTML    = THREE.CodeEditor["html-three-conversion"].convertEventPos3DtoHTML;

  var isFirefox = !!navigator.userAgent.match(/Firefox\//);

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // "exports"
  exports.addMouseEventListener      = addMouseEventListener;
  exports.reemit3DMouseEvent         = reemit3DMouseEvent;
  exports.processScrollbarMouseEvent = processScrollbarMouseEvent;
  exports.raycastIntersectionToDomXY = raycastIntersectionToDomXY;

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // implementation

  function addMouseEventListener(THREExDOMEvents, codeEditor) {
    patchTHREExDOMEventInstance(THREExDOMEvents);
    THREExDOMEvents.addEventListener(
      codeEditor, 'mousedown', function(evt) { return codeEditor.onMouseDown(evt); }, false);
    THREExDOMEvents.addEventListener(
      codeEditor, 'mousemove', function(evt) { return codeEditor.onMouseMove(evt); }, false);
    THREExDOMEvents.addEventListener(
      codeEditor, 'mousewheel', function(evt) { return codeEditor.onMouseWheel(evt); }, false);
  }

  function patchTHREExDOMEventInstance(domEvents) {
    // see https://github.com/mrdoob/three.js/issues/5587
    domEvents._projector.pickingRay = pickingRay;
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
        evt.domEvent = retargetDOMEvent(evt.domEvent, convertEventPos3DtoHTML(evt, THREExDOMEvents._camera, THREExDOMEvents._domElement, aceEdEl, codeEditor), aceEdEl);

        mouseMoveHandler = mouseMoveHandler && chain(mouseMoveHandler)
          .getOriginal()
          .wrap(function(proceed, evt) {
            return evt && proceed(
              retargetDOMEvent(evt, convertEventPos3DtoHTML(evt, THREExDOMEvents._camera, THREExDOMEvents._domElement, aceEdEl, codeEditor), aceEdEl));
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
              retargetDOMEvent(evt, convertEventPos3DtoHTML(evt, THREExDOMEvents._camera, THREExDOMEvents._domElement, aceEdEl, codeEditor), aceEdEl));
          }).value();

        releaseCaptureHandler = chain(releaseCaptureHandler)
          .getOriginal()
          .wrap(function(proceed, evt) {
            return evt && proceed(
              retargetDOMEvent(evt, convertEventPos3DtoHTML(evt, THREExDOMEvents._camera, THREExDOMEvents._domElement, aceEdEl, codeEditor), aceEdEl));
          }).value();

        return proceed(el, eventHandler, releaseCaptureHandler);
      }).value();
  }

})(THREE.CodeEditor.mouseevents || (THREE.CodeEditor.mouseevents = {}));
