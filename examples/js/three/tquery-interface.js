function setupTQuery(threeState, thenDo) {
  /*global tQuery, tQueryWorld, THREE*/

  var state = threeState;
  var scene = state.scene;
  var world = window.tQueryWorld = tQuery.createWorld({scene: scene, camera: state.camera, renderer: state.renderer});

  // if (state.orbitControl) world.setCameraControls(state.orbitControl);

  // var domEvent = window.THREEdomEvent = new THREEx.DomEvents(state.camera, state.renderer.domElement);

  // see https://github.com/mrdoob/three.js/issues/5587
//   domEvent.pickObjFromDOMEvent = function(evt, objsToPick, camera) {
//     var mouseCoords = domEvent._getRelativeMouseXY(evt);
// 	var vector	    = new THREE.Vector3(mouseCoords.x, mouseCoords.y, 0.5);
// 	var ray         = this._projector.pickingRay(vector, camera);
// 	var intersects  = ray.intersectObjects(objsToPick);
// 	return intersects[0];
//   }

//   domEvent._projector.pickingRay = function( coords, camera ) {
//     var raycaster = new THREE.Raycaster();
//     // the camera is assumed _not_ to be a child of a transformed object
//     if ( camera instanceof THREE.PerspectiveCamera ) {
//         raycaster.ray.origin.copy( camera.position );
//         raycaster.ray.direction.set( coords.x, coords.y, 0.5 ).unproject( camera ).sub( camera.position ).normalize();
//     } else if ( camera instanceof THREE.OrthographicCamera ) {
//         raycaster.ray.origin.set( coords.x, coords.y, - 1 ).unproject( camera );
//         raycaster.ray.direction.set( 0, 0, - 1 ).transformDirection( camera.matrixWorld );
//     } else {
//         console.error( 'ERROR: undefinedzunknown camera type.' );
//     }
//     return raycaster;
//   }

  tQuery.v = tQuery.v3 = tQuery.createVector3;

  tQuery.createLine = function (from, to) {
    var args = Array.prototype.slice.call(arguments);
    if (args.length >= 6) {
      from = tQuery.createVector3(args.slice(0,3));
      to = tQuery.createVector3(args.slice(3,6));
      args = args.slice(6);
    } else {
      from = tQuery.createVector3(from);
      to = tQuery.createVector3(to);
      args = args.slice(2);
    }
    var material = new THREE.LineBasicMaterial({ color: 0x0000ff });
    var geometry = new THREE.Geometry();
    geometry.vertices.push(from);
    geometry.vertices.push(to);
    var line = new THREE.Line(geometry, material);
    return tQuery(line);
  }

  tQuery.dot = function(pos, radius) {
    // var material = new THREE.MeshPhongMaterial({
    //   color: 0xaaaaaa, specular: 0xffffff, shininess: 2,
    //   vertexColors: THREE.FaceColors, shading: THREE.SmoothShading});
    if (arguments.length >= 3) {
      pos = tQuery.createVector3(arguments[0],arguments[1],arguments[2]);
      radius = arguments[3];
    }
    var material = new THREE.MeshBasicMaterial({ color: "green" });
    var radius = radius || 1; var segments = 12;
    var dot = new THREE.Mesh(new THREE.SphereGeometry( radius, segments,segments), material );
  	dot.castShadow = true;
  	dot.receiveShadow = true;
  	pos = tQuery.createVector3(pos || 0,0,0);
    if (pos) dot.position.copy(pos)
    return tQuery(dot);
  }

  tQuery.showCube = function(parent, bounds) {
    var size = bounds.size();
    var showCube = tQuery.createCube(size.x, size.y,size.z)
      .addTo(parent)
      .position(bounds.center())
      .setBasicMaterial({wireframe: true, color: "red"})
      .back();
    setTimeout(showCube.detach.bind(showCube), 3*1000);
  	return this;
  }

  tQuery.Object3D.prototype.root = function() {
    var root, current = this.get(0);
    while (current) { root = current; current = current.parent; }
    return tQuery(root);
  }

  tQuery.Object3D.prototype.parent = function() {
    var parents = [];
    this.each(function(ea) { ea.parent && parents.push(ea.parent); });
    var result = new tQuery.Object3D()
    result._lists = parents;
    return result;
  }

  tQuery.Object3D.prototype.show = function (bounds) {
    bounds = buildBounds(this, bounds);

    var root, current = this.get(0);
    while((current = current.parent)) root = current;
    tQuery.showCube(root, bounds);
    return this;
    
    // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

    function buildBounds(tQueryObj, bounds) {
      tQueryObj.each(function(obj3D) {
        if (!!obj3D.geometry) {
          var geo = obj3D.geometry;
          geo.computeBoundingBox();
          var tfm = obj3D.matrixWorld;
          var box = geo.boundingBox.clone().applyMatrix4(tfm);
          if (bounds) bounds.union(box); else bounds = box;
          return;
        }
    
        if (obj3D.children) {
          obj3D.children.forEach(function(ea) {
            buildBounds(tQuery(ea), bounds); });
        }
      });
      return bounds;
    }

  }

  tQuery.World.prototype.cameraLookDir = function() {
    var camera = this.tCamera();
    return new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation, camera.eulerOrder);
  }

  tQuery.World.prototype.cameraViewportSizeIn = function(dist) {
    var camera = this.tCamera();
    var height = 2*dist * Math.tan(Math.PI * camera.fov / 360);
    return height;
  }

  tQuery.World.prototype.cameraDistToFit = function(height) {
    var camera = this.tCamera();
    var dist = height / 2 / Math.tan(Math.PI * camera.fov / 360);
  }

  tQuery.World.prototype.dot = function(pos, radius) {
    if (arguments.length >= 3) {
      pos = tQuery.createVector3(arguments[0],arguments[1],arguments[2]);
      radius = arguments[3];
    }
    if (!radius) radius = this.cameraViewportSizeIn(100)/20;
    return tQuery.dot.apply(pos, radius).addTo(this);
  }

  tQuery.World.prototype.show = function(arg) {
    var height = this.cameraViewportSizeIn(100)/20;
    var pos;
    if (arg && typeof arg.show === 'function') return arg.show();
    else if (arguments.length > 0) pos = tQuery.createVector3.apply(tQuery, arguments);
    else pos = tQuery.createVector3(0,0,0);
    var bounds = new THREE.Box3(
      pos.clone().sub(tQuery.createVector3(height/2,height/2,height/2)),
      pos.clone().add(tQuery.createVector3(height/2,height/2,height/2)));
    tQuery.showCube(this, bounds);
    return this;
  }

  thenDo && thenDo(null, tQuery);
}

