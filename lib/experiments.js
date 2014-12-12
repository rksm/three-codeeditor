// "imports"

var pickingRay                  = THREE.CodeEditor.raycasting.pickingRay;
var getRelativeMouseXYFromEvent = THREE.CodeEditor.raycasting.getRelativeMouseXYFromEvent;
var getRelativeMouseXY          = THREE.CodeEditor.raycasting.getRelativeMouseXY;
var isFullscreen                = THREE.CodeEditor.domevents.isFullscreen;

// var recorder = {};
// lively.vm.syncEval("var x = 1+2", {topLevelVarRecorder: recorder})
// recorder

function createCube() {
  if (tQuery("box").length > 0) return;
  return tQuery.createCube()
      .addTo(tQueryWorld)
      .scale(200,200,200)
      .show()
}

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

var browserMousePosition = {x:0,y:0};
// var browserMousePosition = {
//   get x() { return isFullscreen() ? window.innerWidth/2 : this._x; },
//   get y() { return isFullscreen() ? window.innerHeight/2 : this._y; },
//   set x(val) { return this._x = val; },
//   set y(val) { return this._y = val; }
// };

var eventsInitialized = eventsInitialized || false;
function initEvents() {
  eventsInitialized = true;
  function mouseDownRaw(evt) { window.onMouseDown(evt); }
  function mouseUpRaw(evt) { window.onMouseUp(evt); }
  function mouseMoveRaw(evt) { window.onMouseMove(evt); }
  world.renderer.domElement.addEventListener("mousedown", mouseDownRaw, false);
  world.renderer.domElement.addEventListener("mouseup", mouseUpRaw, false);
  world.renderer.domElement.addEventListener("mousemove", mouseMoveRaw, false);

  world.keyboardState = {controlOrCommandPressed: false};
  Mousetrap.bind(["command", "ctrl"], function(evt) { world.keyboardState.controlOrCommandPressed = false;  }, 'keyup');
  Mousetrap.bind(["command", "ctrl"], function(evt) {
    world.keyboardState.controlOrCommandPressed = true;  }, 'keydown');
  
  world.transformControl = new THREE.TransformControls(world.camera, world.renderer.domElement);

  world.transformControl.addEventListener('change', function() {
      world.transformControl.update();
			world.renderer.render( world.scene, world.camera );
  });

  Mousetrap.bind("f3", function() { drawRay(); });

  window.addEventListener("mousedown", function(evt) {
    if (evt.target === world.renderer.domElement)
      debugger;
  });

  window.addEventListener("mousemove", function(evt) {
    // browserMousePosition.x = isFullscreen() ? window.innerWidth/2 : evt.pageX;
    // browserMousePosition.y = isFullscreen() ? window.innerHeight/2 : evt.pageY;
    browserMousePosition.x = evt.pageX;
    browserMousePosition.y = evt.pageY;
  });
}
initEvents();

function test() {
  tQuery('box').get(0).material.wireframe=true
  tQuery('box').position(100,-100,0)
  world.transformControl.change(function(evt) { console.log("changed"); })
    
  world.transformControl.attach(tQuery('box').get(0))
  
  mouseState.handler = null
  world.transformControl.detach(tQuery('box').get(0))
  world.transformControl.position.set(100,0,0)
  world.transformControl.add(tQuery('box').get(0))
  world.transformControl.update()
  
  tQuery('box').get(0).material.needsUpdate=true
  world.transformControl.updateMatrixWorld( true)
  world.transformControl.scale.set(100,100,100)
  tQuery(world.transformControl.object).show()
  world.transformControl.setSize(2)
  world.renderer.sortObjects = false;

}


// -=-=-=-=-=-
// raycasting
// -=-=-=-=-=-


function drawRay(coords) {
  coords = coords || getRelativeMouseXY(browserMousePosition.x,browserMousePosition.y, world.renderer.domElement);
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

window.THREExDOMEvents = codeEditor.THREExDOMEvents
var mouseState = {}

// -=-=-=-=-=-=-=-
// mouse handlers
// -=-=-=-=-=-=-=-

function objectsFromMouseEvent(evt, objectsToPick) {
	var c = world.camera || null;
	var projector	= new THREE.Projector();
	var mouse = getRelativeMouseXYFromEvent(evt);
	var vector	= new THREE.Vector3(mouse.x, mouse.y, 05 );
	var ray         = pickingRay(vector, c);
	return ray.intersectObjects(objectsToPick);
}

// handlers

function transformControlHandler(evt) {
  if (!world.keyboardState.controlOrCommandPressed) return null;


  var hits = objectsFromMouseEvent(evt,  world.scene.children);
  if (!hits.length) return null;
  world.scene.add(world.transformControl);
  world.transformControl.attach(hits[0].object);

  var ctrl = world.transformControl;
  
  Mousetrap.bind("q", function(evt) { ctrl.setSpace(ctrl.space == "local" ? "world" : "local"); });
  Mousetrap.bind("w", function(evt) { ctrl.setMode("translate"); });
  Mousetrap.bind("e", function(evt) { ctrl.setMode("rotate"); });
  Mousetrap.bind("r", function(evt) { ctrl.setMode("scale"); });
  Mousetrap.bind("-", function(evt) { ctrl.setSize(ctrl.size - 0.1);})
  Mousetrap.bind("+", function(evt) { ctrl.setSize(ctrl.size + 0.1);})

  return {
    handleMouseDown: function(evt) {
      if (!world.keyboardState.controlOrCommandPressed) {
        world.transformControl.update();
        return;
      }
      console.log('transform control released');
      world.transformControl.detach(world.transformControl.object);
      world.scene.remove(world.transformControl);
      mouseState.handler = null;
      
    },
    handleMouseMove: function(evt) {
      world.transformControl.update();
    },
    handleMouseUp: function(evt) {},
  }
}

function dragHandler(evt) {
  evt.preventDefault(); evt.stopPropagation();
  var camera = world.camera;
  var hits = objectsFromMouseEvent(evt,  tQuery('box')._lists);
  if (!hits.length) return null;

  var dragSphere = new THREE.Sphere(
    camera.position,
    camera.position.distanceTo(
      hits[0].object.position.clone()));

  console.log('spherical drag handler installed');
  return {
    dragTarget: hits[0].object,
    hit: hits[0],
    dragSphere: dragSphere,
    handleMouseDown: function(evt) { mouseState.handler = null; },
    handleMouseMove: function(evt) {
      evt.preventDefault(); evt.stopPropagation();
      var coords = getRelativeMouseXYFromEvent(evt);
      var raycaster = pickingRay(coords, camera)
      var dragToPoint = raycaster.ray.intersectSphere(dragSphere);
      hits[0].object.position.copy(dragToPoint);
    },
    handleMouseUp: function() {
      mouseState.handler = null;
      console.log('spherical drag handler released');
    }
  }
}

function onMouseDown(evt) {
  window.LastEvent = evt;
  if (mouseState.handler) mouseState.handler.handleMouseDown(evt);
  
  if (mouseState.handler) return;

  mouseState.handler = transformControlHandler(evt)
                    || dragHandler(evt);
}

function onMouseUp(evt) {
  if (mouseState.handler)
    mouseState.handler.handleMouseUp(evt);
}

function onMouseMove(evt) {
  if (mouseState.handler)
    mouseState.handler.handleMouseMove(evt);
}





// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  
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

function follingAround() {
  var plane3D = tQuery.createPlane().addTo(tQueryWorld)
  plane3D.position(tQuery('box').position())
plane3D.scale(300,300,300)
plane3D.lookAt(world.camera.position)
plane3D.show()
plane3D.material().attr('color','red')
plane3D.material().get(0).side = THREE.DoubleSide

  var box = tQuery('box').get(0)
  tQuery('box').removeFrom(tQueryWorld)
  world.camera.position.distanceTo(box.position)
  // tQuery.showCube(parent, bounds)
  // var box2 = tQuery.createCube(20,20,20).position(world.camera.position.clone())
  var box2 = tQuery.createCube(100,100,100).position(box.position.clone())
  // box2.scale(10,10,10)
  
  // tQueryWorld.add(box2)
  // tQueryWorld.remove(box2)
  // plane3D.position().distanceTo(world.camera.position)

  // var dist = tQuery("box").position().distanceTo(world.camera.position);
  // tQuery("box").position(0,0,0)
  var dist = tQuery("box").position().distanceTo(tQuery.v(0,0,0));
  // var vectorToPlane = tQuery("box").position().clone().sub(world.camera.position);
  var vectorToPlane = tQuery("box").position().clone().sub(world.camera.position);
  var normal = vectorToPlane.negate().normalize()
  var plane = new THREE.Plane(normal, dist )
  plane3D.position(tQuery("box").position())


}

function showPlane(plane) {
  if (window.arrowHelper) world.scene.remove( window.arrowHelper );
  var dir = plane.normal;
  var origin = tQuery("box").position();
  var length = 300;
  var hex = 0xffff00;
  var arrowHelper = new THREE.ArrowHelper( dir, origin, length, hex );
  world.scene.add( arrowHelper );
  window.arrowHelper = arrowHelper;
  // world.scene.remove( arrowHelper );
}

var camera = world.camera;

function cameraFun() {
    
  camera.position.distanceTo(codeEditor.position)
  THREExDOMEvents.camera() === camera
  world.orbitControl.dollyIn(1.2)
  world.orbitControl.dollyOut(1.1)
  codeEditor.scrollSpeed = 20
  camera.zoom = 2
  camera.updateProjectionMatrix()
  // alignCodeEditor()
  camera.fov = 75
  camera.setLens
  camera.fov
  world.scene.add(new THREE.CameraHelper(camera.clone()))
  world.scene.remove(lively.lang.arr.last(world.scene.children))
  world.scene.children.slice(20).forEach(function(ea) { world.scene.remove(ea); })
  
  camera.fov = 120;
  camera.updateProjectionMatrix();
}


// -=-=-=-=-=-=-=-
// dat gui setup 
// -=-=-=-=-=-=-=-

var gui, userOptions;
(function setupDatGui() {
  if (gui) gui.destroy();
  gui = new dat.GUI();
  userOptions = {
    "fullscreen": enterFullscreen,
    "stay aligned": false,
    "editor height": codeEditor.getHeight(),
    "editor width": codeEditor.getWidth(),
    "shoot ray": function() { drawRay({x:0,y:0}); },
    "remove rays": removeRays,
    "show console": true,
    _setConsole: function(val) {
      var style = document.querySelector("#log").style;
      style.display = val ? "" : "none";
      gui.saveToLocalStorageIfPossible();
    }
  };
  
  gui.remember(userOptions);

  gui.add(userOptions, "fullscreen");
 
  var f1 = gui.addFolder('editor');
  f1.add(userOptions, "stay aligned").onChange(setStayAligned).listen();
  
  Mousetrap.bind('alt+f', function(evt) {
    evt.preventDefault(); evt.stopPropagation();
    var val = userOptions["stay aligned"] = !userOptions["stay aligned"];
    setStayAligned(val);
  });
  
  f1.add(userOptions, 'editor height', 20, 4000).listen().onChange(function(val) {
    codeEditor.setHeight(val);
    gui.saveToLocalStorageIfPossible();
  });
  f1.add(userOptions, 'editor width', 20, 1200).listen().onChange(function(val) {
    codeEditor.setWidth(val);
    gui.saveToLocalStorageIfPossible();
  });

  var f2 = gui.addFolder('debugging');  
  f2.add(userOptions, "shoot ray");
  f2.add(userOptions, "remove rays");
  
  f2.add(userOptions, 'show console').onChange(userOptions._setConsole)
  
  f1.open();
  f2.open();
  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-  

  document.addEventListener("DOMContentLoaded", function() {
    userOptions._setConsole(userOptions["show console"]);
    setStayAligned(userOptions["stay aligned"]);
    codeEditor.setHeight(userOptions["editor height"])
    codeEditor.setWidth(userOptions["editor width"])
  });
  
  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

  function enterFullscreen() {
    if (world.vr && world.vr.effect) world.vr.effect.setFullScreen(true);
    else world.renderer.domElement[world.renderer.domElement.mozRequestFullScreen? 'mozRequestFullScreen' : 'webkitRequestFullScreen']();
  }

  function setStayAligned(val) {
    var method = val ? "addAnimationCallback" : "removeAnimationCallback";
    world[method]("align-editor-callback", function() {
      lively.lang.fun.throttleNamed("align-editor-callback", 1000, function() {
        codeEditor.alignWithCamera("left", camera); })(); });
    gui.saveToLocalStorageIfPossible();
  }
})();


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
  stored.versions.forEach(function(ea) { ed.setValue(ea); ed.session.markUndoGroup(); });
  ed.setValue(stored.editorContent);
  console.log("restored editor content from localStorage");
}

function store() {
  var stored = getStoredContent();
  if (stored.versions.length > 50) stored.versions.shift();
  if (stored.editorContent && stored.editorContent !== stored.versions[stored.versions.length-1])
    stored.versions.push(stored.editorContent);
  stored.editorContent = ed.getValue();
  localStorage[key] = JSON.stringify(stored);
  // console.log("stored editor content to localStorage");
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

lively.lang.deprecatedLivelyPatches()
camera.far = 100000;
camera.updateProjectionMatrix()
