;(function(exports) {

  // "imports"
  var retargetDOMEvent = THREE.CodeEditor.domevents.retargetDOMEvent;
  var isFullscreen     = THREE.CodeEditor.domevents.isFullscreen;

  // "exports"
  exports.getRelativeMouseXY          = getRelativeMouseXY;
  exports.getRelativeMouseXYFromEvent = getRelativeMouseXYFromEvent;
  exports.domEventRaycast             = domEventRaycast;
  exports.pickObjFromDOMEvent         = pickObjFromDOMEvent;
  exports.pickingRay                  = pickingRay;
  exports.raycastIntersectionToDomXY  = raycastIntersectionToDomXY;
  exports.convertToBrowserCoords      = convertToBrowserCoords;
  exports.convertEventPos3DtoHTML     = convertEventPos3DtoHTML;

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

  function getRelativeMouseXY(domEvent) {
    // Stolen from THREEx.DomEvents. Converts the x/y coordinates of `domEvent`
    // into relative -1/1 values. These can be used by THREE for raycasting.

  	var element = domEvent.target || domEvent.srcElement;
  	if (element.nodeType === 3) {
  		element = element.parentNode; // Safari fix -- see http://www.quirksmode.org/js/events_properties.html
  	}

  	//get the real position of an element relative to the page starting point (0, 0)
  	//credits go to brainjam on answering http://stackoverflow.com/questions/5755312/getting-mouse-position-relative-to-content-area-of-an-element
  	var elPosition	= { x : 0 , y : 0};
  	var tmpElement	= element;
  	//store padding
  	var style	= getComputedStyle(tmpElement, null);
  	elPosition.y += parseInt(style.getPropertyValue("padding-top"), 10);
  	elPosition.x += parseInt(style.getPropertyValue("padding-left"), 10);
  	//add positions
  	do {
  		elPosition.x	+= tmpElement.offsetLeft;
  		elPosition.y	+= tmpElement.offsetTop;
  		style		= getComputedStyle(tmpElement, null);

  		elPosition.x	+= parseInt(style.getPropertyValue("border-left-width"), 10);
  		elPosition.y	+= parseInt(style.getPropertyValue("border-top-width"), 10);
  	} while(tmpElement = tmpElement.offsetParent);

  	var elDimension	= {
  		width	: (element === window) ? window.innerWidth	: element.offsetWidth,
  		height	: (element === window) ? window.innerHeight	: element.offsetHeight
  	};

  	return {
  		x : +((domEvent.pageX - elPosition.x) / elDimension.width ) * 2 - 1,
  		y : -((domEvent.pageY - elPosition.y) / elDimension.height) * 2 + 1
  	};
  }

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

  // see https://github.com/mrdoob/three.js/issues/5587
  function pickingRay(coords, camera) {
    var raycaster = new THREE.Raycaster();
    // the camera is assumed _not_ to be a child of a transformed object
    if ( camera instanceof THREE.PerspectiveCamera ) {
        raycaster.ray.origin.copy( camera.position );
        raycaster.ray.direction.set( coords.x, coords.y, 0.5 ).unproject( camera ).sub( camera.position ).normalize();
    } else if ( camera instanceof THREE.OrthographicCamera ) {
        raycaster.ray.origin.set( coords.x, coords.y, - 1 ).unproject( camera );
        raycaster.ray.direction.set( 0, 0, - 1 ).transformDirection( camera.matrixWorld );
    } else {
        console.error( 'ERROR: unknown camera type.' );
    }
    return raycaster;
  }

  function domEventRaycast(domEvent, camera) {
    var mouseCoords = getRelativeMouseXYFromEvent(domEvent),
      	vector	    = new THREE.Vector3(mouseCoords.x, mouseCoords.y, 0.5);
    return pickingRay(vector, camera);
  }


  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // mapping of scene positions
  // -=-=-=-=-=-=-=-=-=-=-=-=-=-

  function pickObjFromDOMEvent(evt, camera, objsToPick) {
    var intersects = domEventRaycast(evt,camera).intersectObjects(objsToPick);
  	return intersects[0];
  }

  function raycastIntersectionToDomXY(intersection, domElement) {
    // Project the raycast result onto a DOM element and return the x/y coords
    // relative to domElements top left.
    if (!intersection) return null;
    var localCoords = convertToBrowserCoords(intersection, intersection.object);
    var aceCoords = {
      x: domElement.offsetLeft + localCoords.x,
      y: domElement.offsetTop + localCoords.y
    }
    return aceCoords;
  }

  function convertToBrowserCoords(intersection, mesh3D) {
    // Convert the raycast point on mesh3D into the top/left coordinate sytem
    // of the DOM. The result coords are local to the mesh3D, not its scene.
    if (!intersection) return null;
    var cache = intersection.cachedLocalBrowserCoords || (intersection.cachedLocalBrowserCoords = {});
    if (cache[mesh3D.uuid]) return cache[mesh3D.uuid];
    mesh3D.geometry.computeBoundingBox()
    var worldPoint            = intersection.point,
        size                  = mesh3D.geometry.boundingBox.size(),
        worldCenter           = mesh3D.position.clone().add(mesh3D.geometry.boundingBox.center()),
        localTopLeft          = mesh3D.worldToLocal(worldCenter).add(size.multiply(new THREE.Vector3(.5,-.5,.5))),
        localEvt              = mesh3D.worldToLocal(worldPoint.clone()),
        browserLocalTopLeft   = localTopLeft.clone().add(localEvt).multiply(new THREE.Vector3(1,-1,1))
    return cache[mesh3D.uuid] = browserLocalTopLeft;
  }

  function convertEventPos3DtoHTML(domEvent, camera, oldEventTargetEl, newEventTargetEl, sceneObject, offset) {
    // DOM evt on 3D scene -> 2D position onto dom element acting as a hypothetical target.
    // Note that `oldEventTargetEl` can be choosen by the caller, it does not
    // neet to be the actual domEvent.target. We use it when getting e.g. scroll
    // events from the ace editor (target is actually the ace editor element) but
    // while the mouse is over the 3d canvas. We then get the targeted object and
    // determine the position the event would have when we would have scrolled
    // over the ace editor directly.
    // ....
    // Takes a domEvent sent to a canvas3d element. Does a ray cast and figures
    // out if and where `sceneObject` was hit by the event (via the "intersection"
    // ray cast result). Then projects the position onto
    // `newEventTargetEl` and returns the local position where this object
    // would have been hit if it would be the actual event target.
    var intersection = pickObjFromDOMEvent(
      retargetDOMEvent(domEvent, {x: domEvent.pageX, y: domEvent.pageY}, oldEventTargetEl),
      camera, [sceneObject]);
    return raycastIntersectionToDomXY(intersection, newEventTargetEl);
  }

})(THREE.CodeEditor["html-three-conversion"] || (THREE.CodeEditor["html-three-conversion"] = {}));
