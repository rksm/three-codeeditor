;(function(exports) {

  var oop = ace.require("ace/lib/oop");
  var fun = lively.lang.fun;
  var AutoComplete = ace.require("ace/autocomplete").Autocomplete;
  var FilteredList = ace.require("ace/autocomplete").FilteredList;

  function alignPlanesTopLeft(plane1, plane2, offset) {
    plane1.rotation.copy(plane2.rotation.clone());
    plane1.updateMatrixWorld(true);
    var a = plane1.geometry.vertices[0].clone().applyMatrix4(plane1.matrixWorld);
    var b = plane2.geometry.vertices[0].clone().applyMatrix4(plane2.matrixWorld);
    var offsetWorld = offset.applyMatrix4(plane1.matrixWorld).sub(plane1.position);
    var fromAtoB = b.clone().sub(a).add(offsetWorld);
    plane1.position.add(fromAtoB); 
    plane1.updateMatrixWorld(true);
  }

  // FIXME move to another place
  function collapseSelection(ed, dir) {
    // dir = 'start' || 'end'
    var sel = ed.selection, range = sel.getRange();
    dir && sel.moveCursorToPosition(range[dir]);
    sel.clearSelection();
  }

  AutoComplete.prototype.showPopup = fun.wrap(
    fun.getOriginal(AutoComplete.prototype.showPopup),
    function(proceed, editor) {
      // completion should also work with "backwards" selection: reverse the
      // selection before cursor movements are interpreted to close the completion
      // popup
      var sel = editor.selection;
      if (sel.isBackwards()) sel.setRange(sel.getRange(), false);
      return proceed(editor);
    });

  AutoComplete.prototype.openPopup = fun.wrap(
    fun.getOriginal(AutoComplete.prototype.openPopup),
    function(proceed, editor, prefix, keepPopupPosition) {

      proceed(editor, prefix, keepPopupPosition);
      
      if (!this.activated) return;

      setTimeout(function() {
        // delayed so that we still have the selection when computing the
        // completions but not for the insertion...
        if (!editor.selection.isEmpty())
          collapseSelection(editor, "end");
      }, 1000);

      this.popup.renderer.container.style.zIndex=-1000;
      this.popup.setFontSize(editor.getFontSize()-4);
    

      var parentEditor = editor.parent3d;
      var popupEditor3d = this.popupEditor3d;
      if (!popupEditor3d) {
        popupEditor3d = this.popupEditor3d = new THREE.CodeEditor(
          world.renderer.domElement, parentEditor.THREExDOMEvents,
          this.popup);
      }

      var size = this.popup.renderer.$size;
      popupEditor3d.setSize(size.scrollerWidth, size.scrollerHeight);
      
      var bounds = this.popup.renderer.container.getBoundingClientRect();
      alignPlanesTopLeft(popupEditor3d, parentEditor, new THREE.Vector3(bounds.left,-bounds.top,.1));

      if (!popupEditor3d.parent) world.scene.add(popupEditor3d);
    });

  AutoComplete.prototype.detach = fun.wrap(
    fun.getOriginal(AutoComplete.prototype.detach),
    function(proceed) {
console.log("DETACH");
      this.popupEditor3d && this.popupEditor3d.parent && this.popupEditor3d.parent.remove(this.popupEditor3d);
      proceed();
    });

  FilteredList.prototype.filterCompletions = fun.wrap(
    fun.getOriginal(FilteredList.prototype.filterCompletions),
    function(proceed, items,needle) {
      var dynamicCompletions = items.filter(function(ea) { return ea.meta === "dynamic"; });
      var result = proceed(items, needle);
      if (!needle) { // make sure the dynamic completions come first
        var maxScore = lively.lang.arr.max(result, function(ea) { return ea.score; }).score;
        if (!result.length) result = dynamicCompletions;
        dynamicCompletions.forEach(function(ea) { ea.score += maxScore; });
      }
      return result;
      // var matchedDynamic = result.filter(function(ea) { return ea.meta === "dynamic"; });
      // var unmatchedDynamic = lively.lang.arr.withoutAll(dynamicCompletions, matchedDynamic);
      // console.log("#all / #unmatched: %s/%s", matchedDynamic.length, unmatchedDynamic.length);
      // return matchedDynamic
      //   .concat(lively.lang.arr.withoutAll(result, matchedDynamic))
      //   .concat(unmatchedDynamic);
    })

})(THREE.CodeEditor.commands || (THREE.CodeEditor.commands = {}));
