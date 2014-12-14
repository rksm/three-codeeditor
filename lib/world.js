(function(exports) {

  // imports
  var DOMEvents = THREEx.DomEvents;

  // exports
  exports.create = create;

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

  var hasVRSupport = !!navigator.mozGetVRDevices || !!navigator.getVRDevices;

  function create(domEl, options, thenDo) {
    // Options:
    // see the options defaults for currently supported flags
    if (typeof thenDo === "undefined" && typeof options === 'function') {
      thenDo = options; options = null;
    }
    options = lively.lang.obj.merge({
      useVR: false,
      useOrbitControl: false,
      width: window.innerWidth,
      height: window.innerHeight
    }, options || {});

    // Export the "world" object that let's us access the state of the scene from
    // the outside.
    var world = {
      renderer:            null,
      events:              null,
      scene:               null,
      camera:              null,
      orbitControl:        null,
      vr:                  {},
      _animationCallbacks: {}
    }

    world.addAnimationCallback    = addAnimationCallback.bind(null, world),
    world.removeAnimationCallback = removeAnimationCallback.bind(null, world),
    world.onResize                = onResize.bind(null, world),
    world.destroy                 = destroy.bind(null, world)

    // Let if fly!
debugger;
    init(world, domEl, options);
    animate(world);

    thenDo && thenDo(null, world);
    return world;
  }


  // -=-=-=-=-=-=-=-=-=-=-=-
  // Helper functions below
  // -=-=-=-=-=-=-=-=-=-=-=-

  // Sets up the scene.
  function init(world, domElement, options) {

    // Create the scene and set the scene size.
    var scene = world.scene = new THREE.Scene();

    // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    // Create a renderer and add it to the DOM.
    var r = world.renderer = new THREE.WebGLRenderer({antialias:true});
    domElement.appendChild(r.domElement);

    // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    // Create a camera, zoom it out from the model a bit, and add it to the scene.
    // camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 20000);
    var camera = world.camera = new THREE.PerspectiveCamera(75, options.width / options.height, 0.1, 1000);
    camera.aspect = options.width/options.height;
    camera.updateProjectionMatrix();
    camera.position.set(100,180,320);
    scene.add(camera);

    if (options.useVR) {
      if (!hasVRSupport) {
        alert("Trying to enable webVR but your browser has no support for it!");
      } else {
        world.vr = {
          effect: new THREE.VREffect(r),
          control: new THREE.VRControls(camera)
        }
    	  world.vr.effect.setSize(options.width, options.height);
        whenHeadmountDisplayReady(world.vr, function() {});
    	  onResize();
      }
    } else {
      r.setSize(options.width, options.height);
    }

    // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    // Create an event listener that resizes the renderer with the browser window.
    world._onResize = onResize.bind(null, world);
    window.addEventListener('resize', world._onResize);

    world.events = new DOMEvents(world.camera, world.renderer.domElement);

    // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    // Lighting
    r.setClearColor(0x333F47, 1);
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
      world.orbitControl = new THREE.OrbitControls(camera, r.domElement);
  }

  // animate is called every once in a while, you can register callbacks
  function animate(world) {
    world.loop = requestAnimationFrame(animate.bind(null, world));

    var evt = {
      type: 'animate',
      defaultPrevented: false,
      preventDefault: function() { this.defaultPrevented = true; }
    }

    lively.lang.arr.detect(Object.keys(world._animationCallbacks), function(name) {
      world._animationCallbacks[name](evt);
      return evt.defaultPrevented;
    });

    if (world.vr.control) world.vr.control.update();
    else if (world.orbitControl) world.orbitControl.update();

    (world.vr.effect || world.renderer).render(world.scene, world.camera);
  }

  function onResize(world) {
    var width = window.innerWidth,
        height = window.innerHeight;
    world.camera.aspect = width / height;
    world.camera.updateProjectionMatrix();
    (world.vr.effect || world.renderer).setSize(width, height);
  }

  function whenHeadmountDisplayReady(state, thenDo) {
    if (!hasVRSupport) { thenDo(new Error("no vr support")); return; }
    (navigator.mozGetVRDevices || navigator.getVRDevices)().then(function(devices) {

      devices.forEach(function(dev) {
        if (dev instanceof HMDVRDevice) state.hmd = dev;
        else if (dev instanceof PositionSensorVRDevice) state.positionSensor = dev;
      });

      var posState = state.positionSensor && state.positionSensor.getState();
      var hasHeadmountDisplay = posState && posState.timeStamp > 0;
      state.isPseudoVR = !hasHeadmountDisplay;
      thenDo && thenDo(null, state);
    });
  }

  function addAnimationCallback(world, name, fn) {
    world._animationCallbacks[name] = fn;
  }

  function removeAnimationCallback(world, name) {
    delete world._animationCallbacks[name];
  }

  function destroy(world, thenDo) {
    if (world._onResize) {
      window.removeEventListener('resize', world._onResize);
      delete world._onResize;
    }

    cancelAnimationFrame(world.loop);
    var thrash = lively.lang.arr.flatten(
      lively.lang.tree.map(world.scene,
        function(n) {
          return n.children.map(function(ea) {
            return lively.lang.arr.filter(
              [ea.geometry,ea.material,ea.material && ea.material.map],
              function(ea) { return ea && ea.dispose; });
          });
        }, function(n) { return n.children; }));
    lively.lang.arr.invoke(thrash, 'dispose');
    var r = world.renderer;
    if (r.domElement.parentNode)
      r.domElement.parentNode.removeChild(r.domElement);
    thenDo && thenDo();
  }

})(THREE.CodeEditor.World || (THREE.CodeEditor.World = {}));
