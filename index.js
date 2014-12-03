/*global THREE,ace*/

THREE.CodeEditor = function() {

  var width = 400, height = 400;
  var editorGeo = plane(
    new THREE.Vector3(-width/2, height/2,0),
    new THREE.Vector3( width/2, height/2,0),
    new THREE.Vector3( width/2,-height/2,0),
    new THREE.Vector3(-width/2,-height/2,0));


  // creating the ace editor instance that will work behind the scenes as our "model"
  var aceEditor  = this.aceEditor = createAceEditor(width, height);
  aceEditor.renderer.on("afterRender", onAceEditorAfterRenderEvent.bind(null, this));
  
  // building the html canvas that will be used as a texture
  var canvas2d = this.canvas2d = createCanvas2d(width, height),
      texture	= new THREE.Texture(canvas2d),
      material= new THREE.MeshBasicMaterial({
        color: "white", map: texture,
        side: THREE.DoubleSide});

  THREE.Mesh.call(this, editorGeo, material);

  editorGeo.computeBoundingBox();
  this.position.copy(editorGeo.boundingBox.center());

  texture.needsUpdate	= true;

};

THREE.CodeEditor.prototype = Object.create(THREE.Mesh.prototype);

(function() {

  this.isCodeEditor3D = true;

  this.setValue = function(text) {
    this.aceEditor.setValue(text);
  };

  this.destroy = function() {
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

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// html canvas
// -=-=-=-=-=-=-

function createCanvas2d(width, height) {
  var el = document.createElement("canvas");
  document.body.appendChild(el);
  el.width = width; el.height = height;
  el.style.width = width + "px"
  el.style.height = height + "px";
  el.cleanup = function() { el.parentNode.removeChild(el) };
  return el;
}

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// ace editor
// -=-=-=-=-=-

function createAceEditor(width, height) {
  var el = document.createElement("div");
  document.body.appendChild(el);
  el.style.width = width + "px"
  el.style.height = height + "px";
  el.style.position = "absolute";
  var editor = ace.edit(el);
  editor.setTheme("ace/theme/twilight");
  editor.getSession().setMode("ace/mode/javascript");
  editor.setOption("useWorker", false);
  editor.setOption("showGutter", false);
  editor.setOption("tabSize", 2);

  editor.cleanup = function() {
    editor.renderer.removeAllListeners("afterRender");
    el.parentNode.removeChild(editor.container);
    editor.destroy();
  }

  return editor;
}

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// rendering on canvas using the ace editor "model"
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

function onAceEditorAfterRenderEvent(codeEditor) {
  // react to render events of ed and attept to render a similar document using
  // the canvas element we control here

  var ed = codeEditor.aceEditor;
  var canvasEditor = codeEditor.canvas2d;
  var c = canvasEditor.getContext("2d");

  c.textBaseline = 'top';
  
  c.fillStyle = "#FFF";
  c.fillRect(0,0,canvasEditor.width,canvasEditor.height);

  c.fillStyle = "#AAA"
  drawMarkerLayer(ed, ed.renderer.$markerBack);

  c.fillStyle = "#666";
  copyText(ed, canvasEditor);

  c.fillStyle = "#DDD"
  drawMarkerLayer(ed, ed.renderer.$markerFront);

  c.fillStyle = "#0E0"
  drawCursorLayer(ed, ed.renderer.$cursorLayer)

  codeEditor.material.map.needsUpdate = true;

  function copyText(codeEditorAce, codeEditorCanvas) {
  		// Display this morph and all of its submorphs (back to front)
  		// if (!clipRect.intersects(bounds())) return;
  		// var bnds = this.innerBounds();
  		// c.save();
  		// c.restore();
  
    // c.clearRect(0,0,bounds.width,bounds.height)
    
    var aceEd     = codeEditorAce;
    var r         = aceEd.renderer;
    var startRow  = r.getFirstVisibleRow();
    var endRow    = r.getLastVisibleRow();
    var lines     = aceEd.session.getLines(startRow, endRow);
    var screenPos = aceEd.renderer.textToScreenCoordinates(startRow, 0);
    var bounds = r.container.getBoundingClientRect();
    // FIXME!!!
    var localPos  = {
      x: screenPos.pageX-bounds.left,
      y: screenPos.pageY-bounds.top};
    // var localPos  = editorModel.localize(pt(globalPos.pageX,globalPos.pageY));

    // aceEd.session.documentToScreenPosition(startRow, 0)
    
    // r.$size
    var fontW  = r.$fontMetrics.$characterSize.height;
    var fontH  = r.$fontMetrics.$characterSize.width;
    var lineH  = r.lineHeight;
    var offset = r.layerConfig.offset + r.layerConfig.gutterOffset;// + (lineH-fontH)/2
    

    var style  = window.getComputedStyle(r.$fontMetrics.$measureNode);
    c.font     = style.font;
    
    var currentPos = {x:localPos.x, y: localPos.y+offset};
    lines.forEach(function(l) {
      c.fillText(l, currentPos.x, currentPos.y);
      currentPos = {x:currentPos.x, y: currentPos.y+lineH};
    });
  
      // r.$fontSize
    // editorModel.getFontSize()
    // editorModel.getFontFamily()
  }

  function drawMarkerLayer(ed, markerLayer) {
    var r = ed.renderer;
    var config = markerLayer.config

    for (var key in markerLayer.markers) {

        var marker = markerLayer.markers[key];
        if (!marker.range) {
            // marker.update(html, marker, marker.session, config);
            continue;
        }
        var range = marker.range.clipRows(config.firstRow, config.lastRow);
        if (range.isEmpty()) continue;

        range = range.toScreenRange(markerLayer.session);
        if (marker.renderer && false) {
            var top = markerLayer.$getTop(range.start.row, config);
            var left = markerLayer.$padding + range.start.column * config.characterWidth;
            marker.renderer(markerLayer, range, left, top, config);
        } else if (marker.type == "fullLine" && false) {
            markerLayer.drawFullLineMarker(marker, range, marker.clazz, config);
        } else if (marker.type == "screenLine") {
            drawScreenLineMarker(marker, range, marker.clazz, config);
        } else if (range.isMultiLine()) {
            if (marker.type == "text")
                false && markerLayer.drawTextMarker(markerLayer, range, marker.clazz, config);
            else
                drawMultiLineMarker(markerLayer, range, marker.clazz, config);
        } else {
          drawSingleLineMarker(markerLayer, range, marker.clazz + " ace_start", config)
        }
    }
  }

  function drawCursorLayer(ed, cursorLayer) {
    var config = cursorLayer.config;

    var selections = cursorLayer.session.$selectionMarkers;
    var i = 0, cursorIndex = 0;

    if (selections === undefined || selections.length === 0){
        selections = [{cursor: null}];
    }

    for (var i = 0, n = selections.length; i < n; i++) {
        var pixelPos = cursorLayer.getPixelPosition(selections[i].cursor, true);
        if ((pixelPos.top > config.height + config.offset ||
             pixelPos.top < 0) && i > 1) {
            continue;
        }

        var style = (cursorLayer.cursors[cursorIndex++] || cursorLayer.addCursor()).style;

        c.fillRect(pixelPos.left,pixelPos.top,config.characterWidth,config.lineHeight);
    }
  }

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // marker related
  // -=-=-=-=-=-=-=-
  function markerGetTop(marker, range, layerConfig) {
    return marker.$getTop ?
      marker.$getTop(range.start.row, layerConfig) :
      (range.start.row - layerConfig.firstRowScreen) * layerConfig.lineHeight;
  }

  function drawMultiLineMarker(marker, range, clazz, config) {
    var padding = marker.$padding;
    var height = config.lineHeight;
    var top = marker.$getTop(range.start.row, config);
    var left = padding + range.start.column * config.characterWidth;

    // firs line
    c.fillRect(left,top,canvasEditor.width,height);
    
    top = marker.$getTop(range.end.row, config);
    var width = range.end.column * config.characterWidth;
    c.fillRect(padding,top,width,height);

    height = (range.end.row - range.start.row - 1) * config.lineHeight;
    if (height < 0) return;
    top = marker.$getTop(range.start.row + 1, config);
    c.fillRect(padding,top,canvasEditor.width,height);
  }

  function drawScreenLineMarker(marker, range, clazz, config) {
    var top = markerGetTop(marker, range, config);
    var height = config.lineHeight;
    var left = 0;
    var fillStyle = c.fillStyle
    c.fillStyle = "#DDD"
    c.fillRect(left,top,canvasEditor.width,height);
    c.fillStyle = fillStyle;
  }

  function drawSingleLineMarker(marker, range, clazz, config, extraLength, extraStyle) {
    var height = config.lineHeight;
    var width = (range.end.column + (extraLength || 0) - range.start.column) * config.characterWidth;
  
    var top = marker.$getTop(range.start.row, config);
    var left = marker.$padding + range.start.column * config.characterWidth;

    // show("drawSingleLineMarker %s %s %s %s", left,top,width,height)
    c.fillRect(left,top,width,height);
  }

}

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// dealing with input events
// -=-=-=-=-=-=-=-=-=-=-=-=-=-

function step3AddEventHandlersToCodeEditor3D(state, thenDo) {
  var canvasEditor = state.canvasEditor;
  var codeEditorAce = state.codeEditorAce;
  var codeEditor3D = state.codeEditor3D;

  codeEditor3D.dispatchCodeEditorEvent = dispatchCodeEditorEvent;

  state.log.push("step3: installed mouse event dispatch method into codeeditor3d");


  try {
    testStuff(state);
  } catch (e) { show(String(e) + " test stuff"); }

  thenDo && thenDo(null, state);

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

  function dispatchCodeEditorEvent(evt, position, canvas3d) {
    // no focus for the THREE morph while we are working with the codeeditor
    canvas3d.focusAllowed = false;
    lively.lang.fun.debounceNamed(
      canvas3d.id+"-codeeditor-key-focus-release", 100,
      function() { canvas3d.focusAllowed = true; })();
  
    reemit3DEvent(evt, position);
    return true;
  }

  // -=-=-=-=-=-=-=-
  // THREE helpers
  // -=-=-=-=-=-=-=-

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // ace editor event hacks below
  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

  var clickState = {lastClickTime: 0}, doubleClickTriggerTime = 500;
  function reemit3DEvent(evt, globalPosForRealEditor) {
    var type = evt.type.replace(/^pointer/, "mouse").toLowerCase();
    patchAceEventMethods();
    var fakeEvt = patchEvent(evt, globalPosForRealEditor);
  
    var MousEvent = ace.require("ace/mouse/mouse_event").MouseEvent;
    var aceEvt = new MousEvent(fakeEvt, codeEditorAce);

    // evt.preventDefault();
    // evt.stopPropagation();

    // if (type === 'mousedown') debugger
    if (type === 'mousedown') {
      
      if (Date.now()-clickState.lastClickTime <= doubleClickTriggerTime) {
        codeEditorAce._emit("dblclick", aceEvt);
      }
      clickState.lastClickTime = Date.now();
    }
    if (type === 'mousedown') codeEditorAce.$mouseHandler.onMouseEvent("mousedown", fakeEvt)
    else if (type === 'mousemove') codeEditorAce.$mouseHandler.onMouseMove('mousemove', fakeEvt);
    else
    codeEditorAce._emit(type, aceEvt);
    if (type === "mousedown") {
        if (!codeEditorAce.isFocused() && codeEditorAce.textInput)
            codeEditorAce.textInput.moveToMouse(new MousEvent(evt, codeEditorAce));
        codeEditorAce.focus();
    }
  }

  function patchAceEventMethods() {
    var chain = lively.lang.chain;

    codeEditorAce.$mouseHandler.captureMouse = chain(codeEditorAce.$mouseHandler.captureMouse)
      .getOriginal().wrap(function(proceed, evt, mouseMoveHandler) {
        evt.domEvent = patchEvent(evt.domEvent, codeeditorAceCoordsFromDOMEventOnThreeScene(evt.domEvent));

        mouseMoveHandler = mouseMoveHandler && chain(mouseMoveHandler)
          .getOriginal()
          .wrap(function(proceed, evt) { if (evt) return proceed(patchEvent(evt, codeeditorAceCoordsFromDOMEventOnThreeScene(evt))); })
          .value();

        return proceed(evt, mouseMoveHandler);
      }).value();

    var evLib = ace.require("ace/lib/event");
    evLib.capture = chain(evLib.capture)
      .getOriginal().wrap(function(proceed, el, eventHandler, releaseCaptureHandler) {

        if (codeEditorAce.container !== el) return proceed(el, eventHandler, releaseCaptureHandler);

        eventHandler = chain(eventHandler)
          .getOriginal()
          .wrap(function(proceed, evt) { if (evt) return proceed(patchEvent(evt, codeeditorAceCoordsFromDOMEventOnThreeScene(evt))); })
          .value();

        releaseCaptureHandler = chain(releaseCaptureHandler)
          .getOriginal()
          .wrap(function(proceed, evt) { if (evt) return proceed(patchEvent(evt, codeeditorAceCoordsFromDOMEventOnThreeScene(evt))); })
          .value();

        return proceed(el, eventHandler, releaseCaptureHandler);

      }).value();

  }

  function patchEvent(evt, globalPosForRealEditor) {
    globalPosForRealEditor = globalPosForRealEditor || {x:0,y:0};
    if (evt.hasCodeEditor3DPatch) return evt;

    var fakeEvt = Object.create(evt)
    Object.defineProperty(fakeEvt, "pageX", {value: globalPosForRealEditor.x});
    Object.defineProperty(fakeEvt, "pageY", {value: globalPosForRealEditor.y});
    Object.defineProperty(fakeEvt, "clientX", {value: globalPosForRealEditor.x});
    Object.defineProperty(fakeEvt, "clientY", {value: globalPosForRealEditor.y});
    Object.defineProperty(fakeEvt, "x", {value: globalPosForRealEditor.x});
    Object.defineProperty(fakeEvt, "y", {value: globalPosForRealEditor.y});
    Object.defineProperty(fakeEvt, "layerX", {value: globalPosForRealEditor.x});
    Object.defineProperty(fakeEvt, "layerY", {value: globalPosForRealEditor.y});
    Object.defineProperty(fakeEvt, "target", {value: codeEditorAce.renderer.content});
    Object.defineProperty(fakeEvt, "srcElement", {value: codeEditorAce.renderer.content});
    Object.defineProperty(fakeEvt, "hasCodeEditor3DPatch", {value: true});
    Object.defineProperty(fakeEvt, "preventDefault", {value: function() { evt.preventDefault(); }});
    return fakeEvt;
  }

}