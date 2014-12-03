;(function(exports) {

  exports.onAceEditorAfterRenderEvent = onAceEditorAfterRenderEvent;

  function onAceEditorAfterRenderEvent(aceEditor, codeEditor) {
    // rendering on canvas using the ace editor "model".
    // codeEditor is an instance of THREE.CodeEditor, a mesh.
    // aceEditor is... an ace editor
    // Here we react to render events of ace and attempt to render a similar
    // document using the canvas element we control here;
  
    var ed = aceEditor;
    var canvasEditor = codeEditor.canvas2d;
    var c = canvasEditor.getContext("2d");
  
    c.textBaseline = 'top';
    
    c.fillStyle = "#FFF";
    c.fillRect(0,0,canvasEditor.width,canvasEditor.height);
  
    c.fillStyle = "#AAA"
    drawMarkerLayer(ed, ed.renderer.$markerBack);
  
    c.fillStyle = "#666";
    copyText(ed, canvasEditor);
  
    c.fillStyle = "#DDD"
    drawMarkerLayer(ed, ed.renderer.$markerFront);
  
    c.fillStyle = "#0E0"
    drawCursorLayer(ed, ed.renderer.$cursorLayer)
  
    codeEditor.material.map.needsUpdate = true;
  
    function copyText(codeEditorAce, codeEditorCanvas) {
  		// Display this morph and all of its submorphs (back to front)
  		// if (!clipRect.intersects(bounds())) return;
  		// var bnds = this.innerBounds();
  		// c.save();
  		// c.restore();
    
      // c.clearRect(0,0,bounds.width,bounds.height)
      
      var aceEd     = codeEditorAce;
      var r         = aceEd.renderer;
      var startRow  = r.getFirstVisibleRow();
      var endRow    = r.getLastVisibleRow();
      var lines     = aceEd.session.getLines(startRow, endRow);
      var screenPos = aceEd.renderer.textToScreenCoordinates(startRow, 0);
      var bounds = r.container.getBoundingClientRect();
      // FIXME!!!
      var localPos  = {
        x: screenPos.pageX-bounds.left,
        y: screenPos.pageY-bounds.top};
      // var localPos  = editorModel.localize(pt(globalPos.pageX,globalPos.pageY));
  
      // aceEd.session.documentToScreenPosition(startRow, 0)
      
      // r.$size
      var fontW  = r.$fontMetrics.$characterSize.height;
      var fontH  = r.$fontMetrics.$characterSize.width;
      var lineH  = r.lineHeight;
      var offset = r.layerConfig.offset + r.layerConfig.gutterOffset;// + (lineH-fontH)/2
      
  
      var style  = window.getComputedStyle(r.$fontMetrics.$measureNode);
      c.font     = style.font;
      
      var currentPos = {x:localPos.x, y: localPos.y+offset};
      lines.forEach(function(l) {
        c.fillText(l, currentPos.x, currentPos.y);
        currentPos = {x:currentPos.x, y: currentPos.y+lineH};
      });
    
        // r.$fontSize
      // editorModel.getFontSize()
      // editorModel.getFontFamily()
    }
  
    function drawMarkerLayer(ed, markerLayer) {
      var r = ed.renderer;
      var config = markerLayer.config
  
      for (var key in markerLayer.markers) {
  
          var marker = markerLayer.markers[key];
          if (!marker.range) {
              // marker.update(html, marker, marker.session, config);
              continue;
          }
          var range = marker.range.clipRows(config.firstRow, config.lastRow);
          if (range.isEmpty()) continue;
  
          range = range.toScreenRange(markerLayer.session);
          if (marker.renderer && false) {
              var top = markerLayer.$getTop(range.start.row, config);
              var left = markerLayer.$padding + range.start.column * config.characterWidth;
              marker.renderer(markerLayer, range, left, top, config);
          } else if (marker.type == "fullLine" && false) {
              markerLayer.drawFullLineMarker(marker, range, marker.clazz, config);
          } else if (marker.type == "screenLine") {
              drawScreenLineMarker(marker, range, marker.clazz, config);
          } else if (range.isMultiLine()) {
              if (marker.type == "text")
                  false && markerLayer.drawTextMarker(markerLayer, range, marker.clazz, config);
              else
                  drawMultiLineMarker(markerLayer, range, marker.clazz, config);
          } else {
            drawSingleLineMarker(markerLayer, range, marker.clazz + " ace_start", config)
          }
      }
    }
  
    function drawCursorLayer(ed, cursorLayer) {
      var config = cursorLayer.config;
  
      var selections = cursorLayer.session.$selectionMarkers;
      var i = 0, cursorIndex = 0;
  
      if (selections === undefined || selections.length === 0){
          selections = [{cursor: null}];
      }
  
      for (var i = 0, n = selections.length; i < n; i++) {
          var pixelPos = cursorLayer.getPixelPosition(selections[i].cursor, true);
          if ((pixelPos.top > config.height + config.offset ||
               pixelPos.top < 0) && i > 1) {
              continue;
          }
  
          var style = (cursorLayer.cursors[cursorIndex++] || cursorLayer.addCursor()).style;
  
          c.fillRect(pixelPos.left,pixelPos.top,config.characterWidth,config.lineHeight);
      }
    }
  
    // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    // marker related
    // -=-=-=-=-=-=-=-
    function markerGetTop(marker, range, layerConfig) {
      return marker.$getTop ?
        marker.$getTop(range.start.row, layerConfig) :
        (range.start.row - layerConfig.firstRowScreen) * layerConfig.lineHeight;
    }
  
    function drawMultiLineMarker(marker, range, clazz, config) {
      var padding = marker.$padding;
      var height = config.lineHeight;
      var top = marker.$getTop(range.start.row, config);
      var left = padding + range.start.column * config.characterWidth;
  
      // firs line
      c.fillRect(left,top,canvasEditor.width,height);
      
      top = marker.$getTop(range.end.row, config);
      var width = range.end.column * config.characterWidth;
      c.fillRect(padding,top,width,height);
  
      height = (range.end.row - range.start.row - 1) * config.lineHeight;
      if (height < 0) return;
      top = marker.$getTop(range.start.row + 1, config);
      c.fillRect(padding,top,canvasEditor.width,height);
    }
  
    function drawScreenLineMarker(marker, range, clazz, config) {
      var top = markerGetTop(marker, range, config);
      var height = config.lineHeight;
      var left = 0;
      var fillStyle = c.fillStyle
      c.fillStyle = "#DDD"
      c.fillRect(left,top,canvasEditor.width,height);
      c.fillStyle = fillStyle;
    }
  
    function drawSingleLineMarker(marker, range, clazz, config, extraLength, extraStyle) {
      var height = config.lineHeight;
      var width = (range.end.column + (extraLength || 0) - range.start.column) * config.characterWidth;
    
      var top = marker.$getTop(range.start.row, config);
      var left = marker.$padding + range.start.column * config.characterWidth;
  
      // show("drawSingleLineMarker %s %s %s %s", left,top,width,height)
      c.fillRect(left,top,width,height);
    }
  
  }
})(THREE.CodeEditor.rendering || (THREE.CodeEditor.rendering = {}));
