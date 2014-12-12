;(function(exports) {

  exports.retargetDOMEvent = retargetDOMEvent;
  exports.isFullscreen;

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

  var isFirefox = !!navigator.userAgent.match(/Firefox\//);

  exports.isFullscreen = function isFullscreen() {
    return !!document.fullScreenElement
        || !!document.webkitFullScreenElement
        || !!document.mozFullScreenElement;
  };

  function retargetDOMEvent(evt, newTargetPos, newTargetEl) {
    newTargetPos = newTargetPos || {x:0, y:0};
    if (evt.hasCodeEditor3DPatch) return evt;

    var x = newTargetPos.x,
        y = newTargetPos.y,
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
      Object.defineProperty(fakeEvt, "mozMovementX",     {value: evt.mozMovementX});
      Object.defineProperty(fakeEvt, "mozMovementY",     {value: evt.mozMovementY});
      Object.defineProperty(fakeEvt, "relatedTarget", {value: evt.relatedTarget});
      Object.defineProperty(fakeEvt, "screenX",       {value: evt.screenX});
      Object.defineProperty(fakeEvt, "screenY",       {value: evt.screenY});
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

})(THREE.CodeEditor.domevents || (THREE.CodeEditor.domevents = {}));
