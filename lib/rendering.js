;(function(exports) {

  exports.onAceEditorAfterRenderEvent = onAceEditorAfterRenderEvent;

  function onAceEditorAfterRenderEvent(aceEditor, codeEditor) {
    // rendering on canvas using the ace editor "model".
    // codeEditor is an instance of THREE.CodeEditor, a mesh.
    // aceEditor is... an ace editor
    // Here we react to render events of ace and attempt to render a similar
    // document using the canvas element we control here;

    // features
    var FOLDSUPPORT = false;
    var SHOWINVISIBLES = false;
    var DISPLAYINDENTGUIDES = false;
    var GUTTERLAYER = false;

    var ed = aceEditor;
    var canvasEditor = codeEditor.canvas2d;
    var c = canvasEditor.getContext("2d");

    // Assemble DOM elements
    var containerEl        = aceEditor.renderer.container;
    var contentEl          = aceEditor.renderer.container.querySelector(".ace_content");
    var textLayerEl        = contentEl.querySelector(".ace_text-layer");
    var markerLayers       = contentEl.querySelectorAll(".ace_marker-layer");
    var backMarkerLayerEl  = markerLayers[0];
    var frontMarkerLayerEl = markerLayers[1]
    var cursorLayerEl      = contentEl.querySelector(".ace_cursor-layer");
    var scrollLeft         = aceEditor.renderer.getScrollLeft();

    var editorStyle = computeStyle(containerEl);

    c.textBaseline = 'top';
    c.fillStyle = editorStyle.backgroundColor;
    c.strokeStyle = editorStyle.borderColor;

    c.fillRect(0,0,canvasEditor.width,canvasEditor.height);

    drawMarkerLayer(ed, ed.renderer.$markerBack);

    copyText(ed, canvasEditor);

    drawMarkerLayer(ed, ed.renderer.$markerFront);

    drawCursorLayer(ed, ed.renderer.$cursorLayer);

    drawScrollbar(codeEditor.getScrollbar());

    codeEditor.material.map.needsUpdate = true;

    function copyText(codeEditorAce, codeEditorCanvas) {
      	// Display this morph and all of its submorphs (back to front)
      	// if (!clipRect.intersects(bounds())) return;
      	// var bnds = this.innerBounds();
      	// c.save();
      	// c.restore();

      // c.clearRect(0,0,canvasEditor.width,canvasEditor.height)

      var aceEd     = codeEditorAce;
      var r         = aceEd.renderer;
      var config    = aceEd.renderer.layerConfig;
      var fontMetrics = aceEd.renderer.$fontMetrics;
      var startRow  = aceEd.renderer.getFirstVisibleRow();
      var endRow    = aceEd.renderer.getLastVisibleRow();
      var lines     = aceEd.session.getLines(startRow, endRow);
      var screenPos = aceEd.renderer.textToScreenCoordinates(startRow, 0);
      var bounds    = aceEd.renderer.container.getBoundingClientRect();

      var fontW  = r.$fontMetrics.$characterSize.height;
      var fontH  = r.$fontMetrics.$characterSize.width;
      var offset = 0; //r.layerConfig.offset + r.layerConfig.gutterOffset;// + (lineH-fontH)/2
      var lineHeight = aceEditor.renderer.layerConfig.lineHeight


      // FIXME!!!
      var localCoords  = {
        x: screenPos.pageX-bounds.left + offset,
        y: screenPos.pageY-bounds.top};
      var fontStyle  = computeStyle(containerEl);
      c.font = fontStyle.fontSize + " " + fontStyle.fontFamily;

      var lineElements = textLayerEl.childNodes;
      var leftOffset = localCoords.x;

      for (var i = 0; i < lineElements.length; i++) {

          var tokenEls = lineElements[i].childNodes;
          for (var j = 0; j < tokenEls.length; j++) {
              var tokenEl = tokenEls[j];

              var cssDecl = computeStyle(tokenEl);
              if (cssDecl) {
                c.fillStyle = cssDecl.color;
              }

              var text = tokenEl.textContent;
              var measured = c.measureText(text);

              if (measured) {
                // c.strokeRect(localCoords.x, localCoords.y, measured.width, lineHeight);
                c.fillText(text, localCoords.x, localCoords.y);
                localCoords.x += measured.width;
              }

              // if (tokenEl.nodeType === tokenEl.TEXT_NODE) {
              //     c.fillText(tokenEls[0].textContent, localCoords.x, localCoords.y);
              // } else {

              // }
          }

          localCoords.x = leftOffset;
          localCoords.y += lineHeight;
      }
    }


    // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    // cursor layer
    // -=-=-=-=-=-

    function drawCursorLayer(ed, cursorLayer) {
      var config = cursorLayer.config;

      var selections = cursorLayer.session.$selectionMarkers;
      var i = 0, cursorIndex = 0;

      if (selections === undefined || selections.length === 0){
          selections = [{cursor: null}];
      }

      var cursorEls = cursorLayerEl.querySelectorAll('.ace_cursor');

      for (var i = 0, n = selections.length; i < n; i++) {

          var pixelPos = cursorLayer.getPixelPosition(selections[i].cursor, true);
          if ((pixelPos.top > config.height + config.offset ||
               pixelPos.top < 0) && i > 1) {
              continue;
          }

          var style = computeStyle(cursorEls[i]);
          var width = config.characterWidth;
          // var style = (cursorLayer.cursors[cursorIndex++] || cursorLayer.addCursor()).style;
          if (style) {
            c.strokeStyle = style.color;
            c.fillStyle = style.color;
            width = parseInt(style.borderLeftWidth) || parseInt(style.width);
          }

          c.fillRect(pixelPos.left - scrollLeft,pixelPos.top-config.offset,width,config.lineHeight);
      }
    }

    // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    // marker layer
    // -=-=-=-=-=-

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

    function markerGetTop(marker, range, layerConfig) {
      return marker.$getTop ?
        marker.$getTop(range.start.row, layerConfig) :
        (range.start.row - layerConfig.firstRowScreen) * layerConfig.lineHeight;
    }

    function drawMultiLineMarker(marker, range, clazz, config) {
      var padding = marker.$padding;
      var height = config.lineHeight;
      var top = marker.$getTop(range.start.row, config)-config.offset;
      var left = (padding + range.start.column * config.characterWidth) - scrollLeft;

      // firs line
      // console.log("drawMultiLineMarker %s", clazz);
      var markerEl = contentEl.querySelector("."+clazz.replace(/ /g, "."));
      var style = markerEl && computeStyle(markerEl);
      if (style) {
        c.strokeStyle = style.borderColor;
        c.fillStyle = style.backgroundColor;
      }

      c.fillRect(left,top,canvasEditor.width,height);

      top = marker.$getTop(range.end.row, config)-config.offset;;
      var width = range.end.column * config.characterWidth;
      c.fillRect(padding,top,width,height);

      height = (range.end.row - range.start.row - 1) * config.lineHeight;
      if (height < 0) return;
      top = marker.$getTop(range.start.row + 1, config)-config.offset;;
      c.fillRect(padding,top,canvasEditor.width,height);
    }

    function drawScreenLineMarker(marker, range, clazz, config) {
      var top = markerGetTop(marker, range, config)-config.offset;;
      var height = config.lineHeight;
      var left = 0;

      // console.log("drawScreenLineMarker %s", clazz);
      var markerEl = contentEl.querySelector("."+clazz.replace(/ /g, "."));
      var style = markerEl && computeStyle(markerEl);
      if (style) {
        c.strokeStyle = style.borderColor;
        c.fillStyle = style.backgroundColor;
      }
      c.fillRect(left,top,canvasEditor.width,height);
    }

    function drawSingleLineMarker(marker, range, clazz, config, extraLength, extraStyle) {
      var height = config.lineHeight;
      var width = (range.end.column + (extraLength || 0) - range.start.column) * config.characterWidth;

      var top = marker.$getTop(range.start.row, config)-config.offset;;
      var left = (marker.$padding + range.start.column * config.characterWidth) - scrollLeft;

      var markerEl = contentEl.querySelector("."+clazz.replace(/ /g, "."));
      var style = markerEl && computeStyle(markerEl);
      if (style) {
        c.strokeStyle = style.borderColor;
        c.fillStyle = style.backgroundColor;
      }
      // console.log("drawSingleLineMarker %s %s", clazz, style.backgroundColor);
      // show("drawSingleLineMarker %s %s %s %s", left,top,width,height)
      c.fillRect(left,top,width,height);
    }

    function drawScrollbar(scrollbar) {
      c.fillStyle = scrollbar.backgroundColor;
      c.strokeStyle = scrollbar.borderColor
      c.lineWidth = scrollbar.borderWidth;
      roundRect(c,
        scrollbar.left,scrollbar.top,
        scrollbar.width,scrollbar.height,
        scrollbar.borderRounding, true, true);
    }
  }

  function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    if (typeof stroke == "undefined" ) stroke = true;
    if (typeof radius === "undefined") radius = 5;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (stroke) ctx.stroke();
    if (fill) ctx.fill();
  }

  function computeStyle(el) {
    if (el.nodeType === el.TEXT_NODE) return null;
    try { return window.getComputedStyle(el); } catch (e) {
      debugger;
      console.log(el.nodeType);
      console.error("Cannot compute style of element\n" + e);
      return null;
    }
  }

})(THREE.CodeEditor.rendering || (THREE.CodeEditor.rendering = {}));
