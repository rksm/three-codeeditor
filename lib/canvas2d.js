;(function(exports) {

  exports.create = create;

  function create(width, height) {
    var el = document.createElement("canvas");
    document.body.appendChild(el);
    el.width = width; el.height = height;
    el.style.position = "absolute";
    el.style.left = 0;
    el.style.top = 0;
    el.style.width = width + "px";
    el.style.height = height + "px";
    el.style.visibility = 'hidden';
    el.cleanup = function() { el.parentNode.removeChild(el) };
    return el;
  }

})(THREE.CodeEditor.canvas2d || (THREE.CodeEditor.canvas2d = {}));
