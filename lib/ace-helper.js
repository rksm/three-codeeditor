;(function(exports) {

  exports.createAceEditor = createAceEditor;

  function createAceEditor(posX, posY, width, height) {
    var el = document.createElement("div");
    document.body.appendChild(el);
    el.style.width = width + "px"
    el.style.height = height + "px";
    el.style.left = (posX || 0) + "px";
    el.style.top = (posY || 0) + "px";
    el.style.zIndex = -1000;
    // el.style.visibility = "hidden";
    el.style.position = "fixed";
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

})(THREE.CodeEditor.aceHelper || (THREE.CodeEditor.aceHelper = {}));
