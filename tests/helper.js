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

function createThreeWorld(domEl, thenDo) {
  // Set up the scene, camera, and renderer as global variables.
  var scene, camera, renderer, loop, orbitControl;
  var width = window.innerWidth, height = window.innerHeight;

  init();
  loop = animate();

  var world = {
    scene: scene,
    renderer: renderer,
    camera: camera,
    control: orbitControl,
    uninstall: uninstall
  }

  thenDo(null, world);

  // Sets up the scene.
  function init() {

    // Create the scene and set the scene size.
    scene = new THREE.Scene();

    // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    // Create a renderer and add it to the DOM.
    renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(width, height);
    domEl.appendChild(renderer.domElement);

    // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    // Create a camera, zoom it out from the model a bit, and add it to the scene.
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 20000);
    camera.position.set(100,180,320);
    scene.add(camera);

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
        new THREE.MeshBasicMaterial( { color: 0x00ffff, wireframe: true, side: THREE.DoubleSide } ));
    plane.position.set(plane.position.x/2, 0, plane.position.z/2);
    plane.rotation.x = Math.PI/2
    scene.add( plane );

    // controls
    // orbitControl = new THREE.OrbitControls(camera, renderer.domElement);
  }

  function animate() {
    loop = requestAnimationFrame(animate);
    renderer.render(scene, camera);
    orbitControl && orbitControl.update();
  }

  function onResize() {
    var width = window.innerWidth,
        height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
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
