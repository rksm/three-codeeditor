function loadUncached(urls, thenDo) {
  if (!urls.length) { thenDo && thenDo(); return; }
  var url = urls.shift();
  var script = document.createElement('script');
  script.src = url + (url.indexOf('?') > -1 ? '&' : '?' + Date.now());
  document.head.appendChild(script);
  script.addEventListener('load', function() { loadUncached(urls, thenDo); });
}

function show(obj) {
  if (!obj) return console.log("SHOW: %s", obj);
  if (obj.show) return obj.show();
  if (obj.x && obj.y && !obj.z) {
    var rect = document.createElement("div");
    var w = 10, h = 10, l = obj.x - w/2, t = obj.y - h/2, color = 'red';
    rect.style.position = "absolute";
    rect.style.left = l + "px";
    rect.style.top = t + "px";
    rect.style.width = w + "px";
    rect.style.height = h + "px";
    rect.style.backgroundColor = color
    document.body.appendChild(rect);
    setTimeout(function() { rect.parentNode.removeChild(rect); }, 3*1000);
    return rect;
  }
  else return console.log("SHOW: %s", lively.lang.obj.inspect(obj, {maxDepth: 4}));
}

function createThreeWorld(domEl, options, thenDo) {
  // Options:
  // see the options defaults for currently supported flags
  if (typeof thenDo === "undefined" && typeof options === 'function') {
    thenDo = options; options = null;
  }
  options = options || {useVR: false, useOrbitControl: false};

  // This is the state of the scene we will construct:
  var scene, camera, renderer, loop, orbitControl, vrControl,
      width = options.width || window.innerWidth,
      height = options.height || window.innerHeight,
      animationCallbacks = [];

  var hasVRSupport = !!navigator.mozGetVRDevices || !!navigator.getVRDevices,
      vrEffect, vrControl, vr = hasVRSupport ? {} : null;

  // Let if fly!
  init();
  animate();

  // Export the "world" object that let's us access the state of the scene from
  // the outside.
  var world = {
    scene: scene,
    renderer: renderer,
    camera: camera,
    orbitControl: orbitControl,
    vr: vr,
    addAnimationCallback: addAnimationCallback,
    removeAnimationCallback: removeAnimationCallback,
    onResize: onResize,
    uninstall: uninstall
  }

  return thenDo(null, world);

  // -=-=-=-=-=-=-=-=-=-=-=-
  // Helper functions below
  // -=-=-=-=-=-=-=-=-=-=-=-

  // Sets up the scene.
  function init() {

    // Create the scene and set the scene size.
    scene = new THREE.Scene();

    // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    // Create a renderer and add it to the DOM.
    renderer = new THREE.WebGLRenderer({antialias:true});
    domEl.appendChild(renderer.domElement);

    // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    // Create a camera, zoom it out from the model a bit, and add it to the scene.
    // camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 20000);
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.aspect = width/height;
    camera.updateProjectionMatrix();
    camera.position.set(100,180,320);
    scene.add(camera);

    if (options.useVR) {
      if (!hasVRSupport) {
        alert("Trying to enable webVR but your browser has no support for it!");
      } else {
    		vr.effect = vrEffect = new THREE.VREffect(renderer);
    	  vrEffect.setSize(width, height);
        vr.control = vrControl = new THREE.VRControls(camera);
        whenHeadmountDisplayReady(vr, function() {});
    	  onResize();
    
      }
    } else {
      renderer.setSize(width, height);
    }

    // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    // Create an event listener that resizes the renderer with the browser window.
    window.addEventListener('resize', onResize);

    // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    // Lighting
    renderer.setClearColor(0x333F47, 1);
    var light = new THREE.PointLight(0xffffff);
    light.position.set(-100,200,100);
    scene.add(light);

    // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    // Geometry
    var plane = new THREE.Mesh(
        new THREE.PlaneGeometry(1000,1000, 20,20),
        new THREE.MeshBasicMaterial({
          color: 0x00ffff, wireframe: true,
          side: THREE.DoubleSide}));
    plane.position.set(plane.position.x/2, 0, plane.position.z/2);
    plane.rotation.x = Math.PI/2
    scene.add(plane);

    // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    // controls
    if (options.useOrbitControl)
      orbitControl = new THREE.OrbitControls(camera, renderer.domElement);
  }

  // animate is called every once in a while, you can register callbacks
  function animate() {
    loop = requestAnimationFrame(animate);

    var evt = {
      type: 'animate',
      defaultPrevented: false,
      preventDefault: function() { this.defaultPrevented = true; }
    }

    lively.lang.arr.detect(Object.keys(animationCallbacks), function(name) {
      animationCallbacks[name](evt);
      return evt.defaultPrevented;
    });

    if (vrControl) vrControl.update();
    else if(orbitControl) orbitControl.update();

    (vrEffect || renderer).render(scene, camera);
  }

  function onResize() {
    var width = window.innerWidth,
        height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    (vrEffect || renderer).setSize(width, height);
  }

  function whenHeadmountDisplayReady(state, thenDo) {
    navigator.getVRDevices && navigator.getVRDevices().then(function(devices) {
      var hasHeadmountDisplay = devices.some(function(dev) {
        if (dev instanceof HMDVRDevice) state.hmd = dev;
        else if (dev instanceof PositionSensorVRDevice) state.positionSensor = dev;
        if (!(dev instanceof PositionSensorVRDevice)) return false;
        var s = dev.getState();
        return s && s.timeStamp > 0;
      });
      if (hasHeadmountDisplay) thenDo && thenDo();
    });
  }

  function addAnimationCallback(name, fn) {
    animationCallbacks[name] = fn;
  }

  function removeAnimationCallback(name) {
    delete animationCallbacks[name];
  }

  function uninstall(thenDo) {
    cancelAnimationFrame(loop);
    var thrash = lively.lang.arr.flatten(
      lively.lang.tree.map(scene,
        function(n) {
          return n.children.map(function(ea) {
            return lively.lang.arr.filter(
              [ea.geometry,ea.material,ea.material && ea.material.map],
              function(ea) { return ea && ea.dispose; });
          });
        }, function(n) { return n.children; }));
    lively.lang.arr.invoke(thrash, 'dispose');
    renderer.domElement.parentNode.removeChild(renderer.domElement);
    thenDo && thenDo();
  }  
}
