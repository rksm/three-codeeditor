// "imports"

var pickingRay                  = THREE.CodeEditor.raycasting.pickingRay;
var getRelativeMouseXYFromEvent = THREE.CodeEditor.raycasting.getRelativeMouseXYFromEvent;
var getRelativeMouseXY          = THREE.CodeEditor.raycasting.getRelativeMouseXY;
var pickObjFromDOMEvent         = THREE.CodeEditor.raycasting.pickObjFromDOMEvent;
var isFullscreen                = THREE.CodeEditor.domevents.isFullscreen;


// some convenient extension of global objects:
lively.lang.deprecatedLivelyPatches();

var inputState = initEvents(inputState);

var userOptions = {
  "fullscreen": function() { world.enterFullScreen(); },
  "align": "none",
  "editor height": codeEditor.getHeight(),
  "editor width": codeEditor.getWidth(),
  "shoot ray": function() { drawRay({x:0,y:0}); },
  "remove rays": removeRays,
  "show console": false,
  _setConsole: function _setConsole(val) {
    gui && gui.saveToLocalStorageIfPossible();
    var log = document.querySelector("#log");
    if (!log && !val) return;
    if (!log) return loadConsoleScript(function() { _setConsole(val); });
    var style = log.style;
    style.display = val ? "" : "none";
  }
};

var gui = setupDatGui(gui, userOptions, world, codeEditor);

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// events
// -=-=-=-
function initEvents(inputState) {

  inputState = inputState || {
    transformControl: null,
  
    keysPressed: [],
  
    keyPressed: function(key) {
      console.log("[inputState] key pressed: " + key);
      lively.lang.arr.pushIfNotIncluded(inputState.keysPressed, key);
    },
  
    keyReleased: function(key) {
      console.log("[inputState] key released: " + key);
      inputState.keysPressed = lively.lang.arr.without(inputState.keysPressed, key);
    },
  
    metaKeyPressed: function() {
      console.log(inputState.keysPressed);
      return inputState.keysPressed.indexOf("command") > -1
          || inputState.keysPressed.indexOf("ctrl") > -1;
    },
  
    browserMousePosition: {x:0,y:0},
  
    get mouseHandler() { return this._mouseHandler; },
    set mouseHandler(val) {
      console.log("[inputState] mouseHandler changed: %s -> %s",
        printmouseHandler(this._mouseHandler), printmouseHandler(val));
      return this._mouseHandler = val;
      function printmouseHandler(val) {
        if (!val) return "no handler";
        else if (val.name) return val.name;
        else return "unknown handler " + val;
      }
    }
  }

  var el = world.renderer.domElement;

  function mouseDownRaw(evt) { window.onMouseDown(evt); }
  function mouseUpRaw(evt) { window.onMouseUp(evt); }
  function mouseMoveRaw(evt) {
    inputState.browserMousePosition.x = evt.pageX;
    inputState.browserMousePosition.y = evt.pageY;
    window.onMouseMove(evt);
  }

  el.addEventListener("mousedown", mouseDownRaw, false);
  el.addEventListener("mouseup", mouseUpRaw, false);
  el.addEventListener("mousemove", mouseMoveRaw, false);

  Mousetrap.bind("ctrl", function(evt) { inputState.keyReleased("ctrl");  }, 'keyup');
  Mousetrap.bind("ctrl", function(evt) { inputState.keyPressed("ctrl");  }, 'keydown');
  Mousetrap.bind("command", function(evt) { inputState.keyReleased("command");  }, 'keyup');
  Mousetrap.bind("command", function(evt) { inputState.keyPressed("command");  }, 'keydown');
  Mousetrap.bind("alt", function(evt) { inputState.keyReleased("alt");  }, 'keyup');
  Mousetrap.bind("alt", function(evt) { inputState.keyPressed("alt");  }, 'keydown');


  // editor alignment shortcuts
  [["alt+c", "center"], ["alt+l", "left"], ["alt+r", "right"]].forEach(function(keyCommand) {
    Mousetrap.bind(keyCommand[0], function(evt) {
      evt.preventDefault(); evt.stopPropagation();
      if (userOptions.align === keyCommand[1]) userOptions.align = "not aligned";
      else userOptions.align = keyCommand[1];
      gui.update();
    });
  });

  Mousetrap.bind("f3", function() { drawRay(); });
  Mousetrap.stopCallback = lively.lang.fun.wrap(
    Mousetrap.stopCallback,
    function(proceed, e, element) {
      return false;
      if (element.className.indexOf("ace_text-input") > -1) return false;
      return proceed(e,element);
    })

  // transformControl
  inputState.transformControl = new THREE.TransformControls(world.camera, el);

  inputState.transformControl.addEventListener('change', function() {
      inputState.transformControl.update();
			world.renderer.render( world.scene, world.camera );
  });


  var oc = world.orbitControl;
  if (oc) {
    // oc.__defineGetter__("enabled", function() { return !codeEditor.aceEditor.isFocused(); });
    oc.__defineGetter__("enabled", function() { return inputState.keysPressed.indexOf("alt") > -1; });

    oc.addEventListener('change', function(evt) { console.log('[inputState] orbit change ' + evt.type); })
    oc.addEventListener('start', function(evt) { console.log('[inputState] orbit start'); })
    oc.addEventListener('end', function(evt) { console.log('[inputState] orbit end'); })
  }
  
  return inputState;
}

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// mouse handlers
// -=-=-=-=-=-=-=-

// handlers

function transformControlHandler(evt) {
console.log("meta pressed? " + inputState.metaKeyPressed());
  if (!inputState.metaKeyPressed()) return null;


  var hit = pickObjFromDOMEvent(evt,  world.camera, world.scene.children);
  if (!hit) return null;
  world.scene.add(inputState.transformControl);
  inputState.transformControl.attach(hit.object);

  var ctrl = inputState.transformControl;

  Mousetrap.bind("q", function(evt) { ctrl.setSpace(ctrl.space == "local" ? "world" : "local"); });
  Mousetrap.bind("w", function(evt) { ctrl.setMode("translate"); });
  Mousetrap.bind("e", function(evt) { ctrl.setMode("rotate"); });
  Mousetrap.bind("r", function(evt) { ctrl.setMode("scale"); });
  Mousetrap.bind("-", function(evt) { ctrl.setSize(ctrl.size - 0.1);})
  Mousetrap.bind("+", function(evt) { ctrl.setSize(ctrl.size + 0.1);})

  return {
    name: "transformControlHandler",
    handleMouseDown: function(evt) {
      if (!inputState.metaKeyPressed()) { inputState.transformControl.update(); return; }
      console.log('[inputState] transform control released');
      inputState.transformControl.detach(inputState.transformControl.object);
      world.scene.remove(inputState.transformControl);
      inputState.mouseHandler = null;

    },
    handleMouseMove: function(evt) {
      inputState.transformControl.update();
    },
    handleMouseUp: function(evt) {},
  }
}

function dragHandler(evt) {
  evt.preventDefault(); evt.stopPropagation();
  var camera = world.camera;
  var hit = pickObjFromDOMEvent(evt, world.camera, tQuery('box')._lists);
  if (!hit) return null;

  var dragSphere = new THREE.Sphere(
    camera.position,
    camera.position.distanceTo(
      hit.object.position.clone()));

  console.log('[inputState] spherical drag handler installed');
  return {
    name: "dragHandler",
    dragTarget: hit.object,
    hit: hit,
    dragSphere: dragSphere,
    handleMouseDown: function(evt) { inputState.mouseHandler = null; },
    handleMouseMove: function(evt) {
      evt.preventDefault(); evt.stopPropagation();
      var coords = getRelativeMouseXYFromEvent(evt);
      var raycaster = pickingRay(coords, camera)
      var dragToPoint = raycaster.ray.intersectSphere(dragSphere);
      hit.object.position.copy(dragToPoint);
    },
    handleMouseUp: function() {
      inputState.mouseHandler = null;
      console.log('[inputState] spherical drag handler released');
    }
  }
}

function onMouseDown(evt) {
  console.log("window down");
  window.LastEvent = evt;
  if (inputState.mouseHandler) inputState.mouseHandler.handleMouseDown(evt);

  if (inputState.mouseHandler) return;

  inputState.mouseHandler = transformControlHandler(evt)
                         || dragHandler(evt);
}

function onMouseUp(evt) {
  if (inputState.mouseHandler)
    inputState.mouseHandler.handleMouseUp(evt);
}

function onMouseMove(evt) {
  if (inputState.mouseHandler)
    inputState.mouseHandler.handleMouseMove(evt);
}

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// raycasting
// -=-=-=-=-=-

function drawRay(coords) {
  coords = coords || getRelativeMouseXY(inputState.browserMousePosition.x,inputState.browserMousePosition.y, world.renderer.domElement);
  var raycaster = pickingRay(coords, world.camera)
  var intersection = raycaster.intersectObjects(world.scene.children.withoutAll(world.scene.children.groupByKey("type").Line || []))[0];
  var from = randomPointOnSphere(5, raycaster.ray.origin)
  var to = intersection ? intersection.point : raycaster.ray.at(10000);
  console.log("[RAY] distance: %s, hit: %s", from.distanceTo(to), intersection ? intersection.object.type : 'none');
  return tQuery.createLine(from, to).addTo(tQueryWorld)
}

function removeRays() {
  tQuery(world.scene.children.groupByKey("type").Line || []).removeFrom(tQueryWorld)
}


// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// dat gui setup
// -=-=-=-=-=-=-=-

function setupDatGui(gui, userOptions, world, codeEditor) {
  if (gui) gui.destroy();
  gui = new dat.GUI({load: true});

  gui.update = function() {
    var controllers = lively.lang.tree.map(this,
        function(ea) { return ea.__controllers; },
        function(ea) { return lively.lang.obj.values(ea.__folders); })
    lively.lang.chain(controllers).flatten()
      .filter(function(ea) { return ["number", "string", "boolean"].indexOf(typeof ea.getValue()) > -1; })
      .forEach(function(ea) { ea.setValue(ea.getValue()); });
  };

  gui.restore = function(userOptions) {
    var stored = this.getSaveObject() && this.getSaveObject().remembered && this.getSaveObject().remembered.Default[0];
    if (stored)
      lively.lang.obj.extend(userOptions, stored);
    this.update();
  };

  gui.addUserOptions = function(userOptions, world, codeEditor) {
    gui.remember(userOptions);
  
    gui.add(userOptions, "fullscreen");
  
    var f1 = gui.addFolder('editor')
    f1.open();
    var f2 = gui.addFolder('debugging');
  
    f1.add(userOptions, "align", ["not aligned", "left", "right", "center"]).onChange(function(dir) {
      if (dir === "not aligned") codeEditor.stopAutoAlignWithCamera();
      else codeEditor.autoAlignWithCamera(dir, world.camera);
      gui.saveToLocalStorageIfPossible();
    });
  
    f1.add(userOptions, 'editor height', 100, window.innerHeight+400).listen().onChange(function(val) {
      codeEditor.setHeight(val);
      gui.saveToLocalStorageIfPossible();
    });
    var ctl = f1.add(userOptions, 'editor width', 100, window.innerWidth).listen().onChange(function(val) {
      codeEditor.setWidth(val);
      gui.saveToLocalStorageIfPossible();
    });
  
    f2.add(userOptions, "shoot ray");
    f2.add(userOptions, "remove rays");
    f2.add(userOptions, 'show console').onChange(userOptions._setConsole)
  };

  gui.addUserOptions(userOptions, world, codeEditor);
  
  gui.restore(userOptions);
  
  return gui;
}


// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// local storage of editor content
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

var key = "editor:" + document.URL;
var ed = codeEditor.aceEditor;

function deleteStoredContent() { delete localStorage[key]; }

getStoredContent()
function getStoredContent() {
  try { var stored = JSON.parse(localStorage[key]); } catch(e) {}
  stored = stored || {};
  if (!stored.editorContent) stored.editorContent = "";
  if (!stored.versions) stored.versions = [];
  return stored;
}

function restore() {
  var stored = getStoredContent();
  stored.versions.forEach(function(ea) {
    ed.setValue(ea);
    ed.session.markUndoGroup();
  });
  ed.setValue(stored.editorContent);
  console.log("[storage] restored editor content from localStorage");
}

function store() {
  var stored = getStoredContent();
  if (stored.versions.length > 50) stored.versions.shift();
  if (stored.editorContent && stored.editorContent !== stored.versions[stored.versions.length-1])
    stored.versions.push(stored.editorContent);
  stored.editorContent = ed.getValue();
  localStorage[key] = JSON.stringify(stored);
  // console.log("[storage] stored editor content to localStorage");
}

codeEditor.aceEditor.on("change", function() {
  lively.lang.fun.debounceNamed("editor-localstorage-process", 1000, store)();
})

document.addEventListener("DOMContentLoaded", function() { restore(); });

window.addEventListener('beforeunload', function(evt) {
  store();
  // if (!!Global.Config.askBeforeQuit) {
  //     var msg = "Lively Kernel data may be lost if not saved.";
  //     evt.returnValue = msg;
  //     return msg;
  // } else return undefined;
})


// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// some helper

function randomPointOnSphere(radius, sphereCenter) {
    // http://gielberkers.com/evenly-distribute-particles-shape-sphere-threejs/
  var x = -1 + Math.random() * 2;
  var y = -1 + Math.random() * 2;
  var z = -1 + Math.random() * 2;
  var d = 1 / Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2) + Math.pow(z, 2));
  x *= d;
  y *= d;
  z *= d;
  return new THREE.Vector3(x * radius,y * radius,z * radius).add(sphereCenter);
}


function planeAtObjectParallelToCamera(rayHit) {
  var hitPos = rayHit.point.clone();
  var dist = hitPos.distanceTo(tQuery.v(0,0,0));
  // var dist = hitPos.distanceTo(rayHit.object.position.clone());
  var vectorToPlane = hitPos.clone().sub(world.camera.position);
  var normal = vectorToPlane.negate().normalize()
  var plane = new THREE.Plane(normal, dist);
  return plane;
}

function loadConsoleScript(thenDo) {
  lively.lang.arr.mapAsyncSeries([
    ["http://ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.js", function() { return !!window.jQuery; }],
    ["http://lively-web.org/users/robertkrahn/just-the-core/html-console.js", function() { return !!document.querySelector("#log"); }]
  ], function(loadData, _, n) {
    var s = document.createElement("script");
    s.src = loadData[0];
    document.body.appendChild(s);
    lively.lang.fun.waitFor(3000, loadData[1], n)
  }, thenDo);
}
