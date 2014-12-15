;(function(exports) {

  exports.onAceEditorAfterRenderEvent = onAceEditorAfterRenderEvent;

  // features
  var FOLDSUPPORT = false;
  var SHOWINVISIBLES = false;
  var DISPLAYINDENTGUIDES = false;
  var GUTTERLAYER = false;

  function onAceEditorAfterRenderEvent(aceEditor, codeEditor) {
    // rendering on canvas using the ace editor "model".
    // codeEditor is an instance of THREE.CodeEditor, a mesh.
    // aceEditor is... an ace editor
    // Here we react to render events of ace and attempt to render a similar
    // document using the canvas element we control here;

    var ed = aceEditor;
    var canvasEditor = codeEditor.canvas2d;
    var ctx = canvasEditor.getContext("2d");

    // base style
    var scrollLeft = ed.renderer.getScrollLeft();
    var editorStyle = computeStyle(aceEditor.renderer.container);
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = editorStyle.backgroundColor;
    ctx.strokeStyle = editorStyle.borderColor;

    ctx.fillRect(0,0,canvasEditor.width,canvasEditor.height);

    drawMarkerLayer(ctx, ed, scrollLeft, ed.renderer.$markerBack);

    drawTextLayer(ctx, ed, scrollLeft);

    drawMarkerLayer(ctx, ed, scrollLeft, ed.renderer.$markerFront);

    drawCursorLayer(ctx, ed, scrollLeft, ed.renderer.$cursorLayer);

    drawScrollbar(ctx, codeEditor.getScrollbar());

    codeEditor.material.map.needsUpdate = true;
  }

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // text layer
  // -=-=-=-=-=-

  function drawTextLayer(ctx, ed, scrollLeft) {
    // take the text and span dom elements, extract their text and style and
    // render them on the 2d canvas

    var r            = ed.renderer,
        bounds       = ed.renderer.container.getBoundingClientRect(),
        config       = ed.renderer.layerConfig,
        lineHeight   = config.lineHeight,
        screenPos    = ed.session.documentToScreenPosition(config.firstRowScreen, 0),
        lineElements = r.$textLayer.element.childNodes,
        localCoords  = {
          x: config.padding,
          y: (config.firstRowScreen*config.lineHeight) - r.scrollTop + r.$fontSize
        },
        leftOffset   = localCoords.x,
        fontStyle    = computeStyle(r.container);

    ctx.font = fontStyle.fontSize + " " + fontStyle.fontFamily;

    for (var i = 0; i < lineElements.length; i++) { // render lines
      var tokenEls = lineElements[i].childNodes;
      for (var j = 0; j < tokenEls.length; j++) { // render tokens
          var tokenEl = tokenEls[j];

          var cssDecl = computeStyle(tokenEl);
          if (cssDecl) ctx.fillStyle = cssDecl.color;

          var text = tokenEl.textContent,
              measured = ctx.measureText(text);

          if (measured) {
            // ctx.strokeRect(localCoords.x, localCoords.y-r.$fontSize, measured.width, lineHeight);
            if (cssDecl && cssDecl.textAlign === 'right')
              localCoords.x = config.width - measured.width;

            ctx.fillText(text, localCoords.x - r.scrollLeft, localCoords.y);
            localCoords.x += measured.width;
          }
      }

      localCoords.x = leftOffset;
      localCoords.y += lineHeight;
    }
  }

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // cursor layer
  // -=-=-=-=-=-

  function drawCursorLayer(ctx, ed, scrollLeft, cursorLayer) {
    var config = cursorLayer.config;

    var selections = cursorLayer.session.$selectionMarkers;
    var i = 0, cursorIndex = 0;

    if (selections === undefined || selections.length === 0){
        selections = [{cursor: null}];
    }

    var cursorEls = cursorLayer.element.querySelectorAll('.ace_cursor');

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
          if (style.backgroundColor && style.backgroundColor !== "transparent") {
            ctx.fillStyle = style.backgroundColor;
          } else {
            ctx.fillStyle = style.color;
            width = parseInt(style.borderLeftWidth) || parseInt(style.width);
          }
          ctx.strokeStyle = style.color;
        }

        ctx.fillRect(
          pixelPos.left - scrollLeft,
          pixelPos.top-config.offset,
          width,config.lineHeight);
    }
  }

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // marker layer
  // -=-=-=-=-=-

  function drawMarkerLayer(ctx, ed, scrollLeft, markerLayer) {
    var r = ed.renderer;
    var config = markerLayer.config
    for (var key in markerLayer.markers) {

        var marker = markerLayer.markers[key];
        if (!marker.range) {
            marker.updateCanvas3D && marker.updateCanvas3D(ctx, markerLayer, scrollLeft, markerLayer.session, config);
            continue;
        }
        var range = marker.range.clipRows(config.firstRow, config.lastRow);
        if (range.isEmpty()) continue;
        range = range.toScreenRange(markerLayer.session);
        if (marker.renderer && false) {
            var top = markerLayer.$getTop(range.start.row, config);
            var left = markerLayer.$padding + range.start.column * config.characterWidth;
            marker.renderer(markerLayer, range, left, top, config);
        } else if (marker.type == "fullLine") {
            drawFullLineMarker(ctx, markerLayer, scrollLeft, range, marker.clazz, config);
        } else if (marker.type == "screenLine") {
            drawScreenLineMarker(ctx, markerLayer, scrollLeft, range, marker.clazz, config);
        } else if (range.isMultiLine()) {
            if (marker.type == "text")
              markerLayer.drawTextMarker(ctx, markerLayer, scrollLeft, range, marker.clazz, config);
            else
              drawMultiLineMarker(ctx, markerLayer, scrollLeft, range, marker.clazz, config);
        } else {
          drawSingleLineMarker(ctx, markerLayer, scrollLeft, range, marker.clazz + " ace_start", config)
        }
    }
  }

  function markerGetTop(marker, range, layerConfig) {
    return marker.$getTop ?
      marker.$getTop(range.start.row, layerConfig) :
      (range.start.row - layerConfig.firstRowScreen) * layerConfig.lineHeight;
  }

  function drawMultiLineMarker(ctx, markerLayer, scrollLeft, range, clazz, config) {
    var padding = markerLayer.$padding;
    var height = config.lineHeight;
    var top = markerLayer.$getTop(range.start.row, config)-config.offset;
    var left = (padding + range.start.column * config.characterWidth) - scrollLeft;

    // firs line
    // console.log("drawMultiLineMarker %s", clazz);
    var markerEl = markerLayer.element.querySelector("."+clazz.replace(/ /g, "."));
    var style = markerEl && computeStyle(markerEl);
    if (style) {
      ctx.strokeStyle = style.borderColor;
      ctx.fillStyle = style.backgroundColor;
    }

    ctx.fillRect(left,top, config.width,height);

    top = markerLayer.$getTop(range.end.row, config)-config.offset;;
    var width = range.end.column * config.characterWidth;
    ctx.fillRect(padding,top,width,height);

    height = (range.end.row - range.start.row - 1) * config.lineHeight;
    if (height < 0) return;
    top = markerLayer.$getTop(range.start.row + 1, config)-config.offset;;
    ctx.fillRect(padding,top, config.width,height);
  }

  function drawScreenLineMarker(ctx, markerLayer, scrollLeft, range, clazz, config) {
    var top = markerLayer.$getTop(range.start.row, config) - config.offset;
    var height = config.lineHeight;
    var left = 0;

    // console.log("drawScreenLineMarker %s", clazz);
    var markerEl = markerLayer.element.querySelector("."+clazz.replace(/ /g, "."));
    var style = markerEl && computeStyle(markerEl);
    if (style) {
      ctx.strokeStyle = style.borderColor;
      ctx.fillStyle = style.backgroundColor;
    }
    ctx.fillRect(left,top, config.width,height);
  }

  function drawSingleLineMarker(ctx, markerLayer, scrollLeft, range, clazz, config, extraLength, extraStyle) {
    var height = config.lineHeight;
    var width = (range.end.column + (extraLength || 0) - range.start.column) * config.characterWidth;

    var top = markerLayer.$getTop(range.start.row, config)-config.offset;
    var left = (markerLayer.$padding + range.start.column * config.characterWidth) - scrollLeft;

    var markerEl = markerLayer.element.querySelector("."+clazz.replace(/ /g, "."));

    var style = markerEl && computeStyle(markerEl);
    if (style) {
      ctx.strokeStyle = style.borderColor;
      ctx.fillStyle = style.backgroundColor;
    }
    // console.log("drawSingleLineMarker %s %s", clazz, style.backgroundColor);
    // show("drawSingleLineMarker %s %s %s %s", left,top,width,height)
    ctx.fillRect(left,top,width,height);
  }

  function drawFullLineMarker(ctx, markerLayer, scrollLeft, range, clazz, config) {
    var top = markerLayer.$getTop(range.start.row, config);
    var height = config.lineHeight;
    if (range.start.row != range.end.row)
        height += markerLayer.$getTop(range.end.row, config) - top;

    var left = (markerLayer.$padding + range.start.column * config.characterWidth) - scrollLeft;
    var markerEl = markerLayer.element.querySelector("."+clazz.replace(/ /g, "."));
    var style = markerEl && computeStyle(markerEl);
    if (style) {
      ctx.strokeStyle = style.borderColor;
      ctx.fillStyle = style.backgroundColor;
    }
    ctx.fillRect(left,top, config.width,height);
  }

  function drawTextMarker(ctx, markerLayer, scrollLeft, range, clazz, config, extraStyle) {
      // selection start
      var row = range.start.row;

      var lineRange = new range.constructor(
          row, range.start.column,
          row, markerLayer.session.getScreenLastRowColumn(row)
      );

      // markerLayer.drawSingleLineMarker(stringBuilder, lineRange, clazz + " ace_start", layerConfig, 1, extraStyle);
      drawSingleLineMarker(ctx, markerLayer, scrollLeft, range, clazz, config, 1, extraStyle);

      // selection end
      row = range.end.row;
      lineRange = new range.constructor(row, 0, row, range.end.column);
      drawSingleLineMarker(ctx, markerLayer, scrollLeft, lineRange, clazz, config, 0, extraStyle);

      for (row = range.start.row + 1; row < range.end.row; row++) {
        lineRange.start.row = row;
        lineRange.end.row = row;
        lineRange.end.column = markerLayer.session.getScreenLastRowColumn(row);
        drawSingleLineMarker(ctx, markerLayer, scrollLeft, lineRange, clazz, config, 1, extraStyle);
      }
  }

  function drawScrollbar(ctx, scrollbar) {
    ctx.fillStyle = scrollbar.backgroundColor;
    ctx.strokeStyle = scrollbar.borderColor
    ctx.lineWidth = scrollbar.borderWidth;
    roundRect(ctx,
      scrollbar.left,scrollbar.top,
      scrollbar.width,scrollbar.height,
      scrollbar.borderRounding, true, true);
  }

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// rendering helper
// -=-=-=-=-=-=-=-=-
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
      console.error("Cannot compute style of %s:\n%s", el.nodeType, e);
      return null;
    }
  }

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // ace additions + patches
  var lang = ace.require("ace/lib/lang");
  var Range = ace.require("ace/range").Range;

  ace.require("ace/search_highlight").SearchHighlight.prototype.updateCanvas3D = function(ctx, markerLayer, scrollLeft, session, config) {
    if (!this.regExp)
        return;
    var start = config.firstRow, end = config.lastRow;

    for (var i = start; i <= end; i++) {
        var ranges = this.cache[i];
        if (ranges == null) {
            ranges = lang.getMatchOffsets(session.getLine(i), this.regExp);
            if (ranges.length > this.MAX_RANGES)
                ranges = ranges.slice(0, this.MAX_RANGES);
            ranges = ranges.map(function(match) {
                return new Range(i, match.offset, i, match.offset + match.length);
            });
            this.cache[i] = ranges.length ? ranges : "";
        }

        for (var j = ranges.length; j --; ) {
          drawSingleLineMarker(
              ctx, markerLayer, scrollLeft, ranges[j].toScreenRange(session), this.clazz, config);
        }
    }
  }

})(THREE.CodeEditor.rendering || (THREE.CodeEditor.rendering = {}));
