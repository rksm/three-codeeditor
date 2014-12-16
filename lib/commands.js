;(function(exports) {

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // selection helper
  // -=-=-=-=-=-=-=-=-

  function saveExcursion(ed, doFunc) {
    // will remember the current selection. doFunc can change the
    // selection, cursor position etc and then invoke the passed in callback
    // `reset` to undo those changes
    var currentRange = ed.selection.getRange();
    function reset() { ed.selection.setRange(currentRange); }
    return doFunc.call(null, reset);
  }

  function collapseSelection(ed, dir) {
    // dir = 'start' || 'end'
    var sel = ed.selection, range = sel.getRange();
    dir && sel.moveCursorToPosition(range[dir]);
    sel.clearSelection();
  }

  function extendSelectionRange(ed, delta) {
    if (!delta) return;
    var dir = delta > 0 ? 'end' : 'start',
        range = ed.selection.getRange(),
        idx = ed.session.doc.positionToIndex(range[dir]),
        extendPos = ed.session.doc.indexToPosition(idx + delta),
        extendedRange = ed.selection.getRange().extend(extendPos.row, extendPos.column);
    return ed.selection.setRange(extendedRange);
  }

  function getSelectionOrLineString(ed, range) {
    if (!range || range.isEmpty()) {
      range = ed.selection.getLineRange(undefined, true);
      ed.selection.setRange(range);
    }
    return ed.session.getTextRange(range);
  }

  function getSelectionMaybeInComment(ed) {
    // FIXME, use tokens!!!
    /*   If you click to the right of '//' in the following...
    'wrong' // 'try this'.slice(4)  //should print 'this'
    'http://zork'.slice(7)          //should print 'zork'
    */
      // If click is in comment, just select that part
    var range = ed.selection.getRange(),
        isNullSelection = range.isEmpty(),
        pos = range.start,
        text = getSelectionOrLineString(ed, range);

    if (!isNullSelection) return text;
  
    // text now equals the text of the current line, now look for JS comment
    var idx = text.indexOf('//');
    if (idx === -1                          // Didn't find '//' comment
        || pos.column < idx                 // the click was before the comment
        || (idx>0 && (':"'+"'").indexOf(text[idx-1]) >=0)    // weird cases
        ) return text;
  
    // Select and return the text between the comment slashes and end of method
    range.start.column = idx+2; range.end.column = text.length;

    ed.selection.setRange(range);
    return text.slice(idx+2);
  }

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // eval helper
  // -=-=-=-=-=-=-

  function printObject(ed, obj, suppressSelection, asComment, optTransformFunc) {
    // inserts a stringified representation of object into editor
    // the current selection is cleared and the stringified representation
    // is inserted at the end (in terms of document position) of the current
    // selection (or at the cursor pos if no sel is active)

    collapseSelection(ed, 'end');
    var string;
    try {
        string = obj instanceof Error ? printError(obj) : String(obj);
    } catch (e) { string = printError(e); }
    if (asComment) string = commentify(string, ed.session.getMode().lineCommentStart);
    ed.onPaste(string);
    if (!suppressSelection) extendSelectionRange(ed, -string.length);

    function printError(err) {
      var string = String(err.stack || err);
      return string.indexOf(err) > -1 ? string : err + '\n' + string;
    }
  
    function commentify(string, lineCommentStart) {
      return " " + lineCommentStart + Strings.lines(string)
        .join('\n' + lineCommentStart + " ")
    }
  }

  function doit(ed, printResult, printAsComment) {
    var text = getSelectionMaybeInComment(ed),
        range = ed.selection.getRange(),
        result = tryBoundEval(text, {range: {start: {index: range[0]}, end: {index: range[1]}}});
    if (printResult) {
      if (printAsComment) {
        try { result = " => " + lively.lang.obj.inspect(result, {maxDepth: 4});
        } catch (e) { result = " => Error printing inspect view of " + result + ": " + e; }
      }
      if (typeof printResult === "function") { // transform func
        result = printResult(result);
      }
      printObject(ed, result, false, printAsComment, printResult);
      return;
    }
    if (result && result instanceof Error) {
        console.error("doit error:\n" + (result.stack || result));
    }
    if (ed.selection.isEmpty()) ed.selection.selectLine();
    return result;
  }

  function tryBoundEval(__evalStatement, options) {
    options = options || {};
    if (!options.sourceURL) options.sourceURL = doit + "-" + Date.now();
    try {
      return lively.vm.syncEval(__evalStatement, {
        context: options.context || window,
        topLevelVarRecorder: window,
        varRecorderName: 'window',
        dontTransform: lively.ast.query.knownGlobals,
        sourceURL: options ? options.sourceURL : undefined
      });
    } catch(e) { return e; }
  }

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // command helper
  // -=-=-=-=-=-=-=-

  function maybeUseModeFunction(modeMethodName, staticArgs, defaultAction) {
    if (!defaultAction && typeof staticArgs === "function") {
      defaultAction = staticArgs; staticArgs = null;
    }
    if (!staticArgs) staticArgs = [];
    return function(ed, args) {
      args = args || [];
      var mode = ed.session.getMode();
      if (!mode[modeMethodName] && defaultAction) defaultAction.call(null, ed, staticArgs.concat([args]));
      else mode[modeMethodName].apply(mode, [ed].concat(staticArgs).concat(Array.isArray(args) ? args : [args]));
    }
  }

  // -=-=-=-=-=-=-=-=-=-=-
  // javascript commands
  // -=-=-=-=-=-=-=-=-=-=-

  exports.javascript = [{
    name: 'evalAll',
      exec: function(ed, args) {
        if (args && args.confirm) {
            console.log('Evaluating complete text...');
        }
        maybeUseModeFunction("doEval", function(ed, args) {
          saveExcursion(ed, function(whenDone) {
            ed.selectAll(); doit(ed, false); whenDone(); });
        });
      },
      handlesCount: true,
      readOnly: true
  }, {
      name: 'doit',
      bindKey: {win: 'Ctrl-D',  mac: 'Command-D|Ctrl-D'},
      exec: maybeUseModeFunction("doit", function(ed, args) { doit(ed, false); }),
      multiSelectAction: "forEach",
      readOnly: true
  }, {
      name: 'printit',
      bindKey: {win: 'Ctrl-P',  mac: 'Command-P|Ctrl-P'},
      exec: maybeUseModeFunction("printit", function(ed, args) { doit(ed, true); }),
      multiSelectAction: "forEach",
      readOnly: false
  }, {
      name: 'list protocol',
      bindKey: {win: 'Ctrl-Shift-P',  mac: 'Command-Shift-P'},
      exec: function(ed, args) {

        // FIIIIIIIIXME
        lv.l2l.session.actions.completions(
          {data: {expr: getSelectionOrLineString(ed)}}, {answer: function(_, answer) {
            var props = lively.lang.chain(answer.completions).pluck(1).flatten().value();
            printObject(ed, props.join("\n"), false, true);
          }})

      },
      multiSelectAction: "single",
      readOnly: false
  }, {
      name: 'doSave',
      bindKey: {win: 'Ctrl-S',  mac: 'Command-S|Ctrl-S'},
      exec: function() { console.warn("do save command is not yet implemented"); },
      multiSelectAction: "single",
      readOnly: false
  }, {
      name: 'printInspect',
      bindKey: {win: 'Ctrl-I',  mac: 'Command-i|Ctrl-i'},
      exec: maybeUseModeFunction("printInspect", function(ed, args) {
        doit(ed, function(result) {
          return result instanceof Error ?
            result.stack || String(result) :
            lively.lang.obj.inspect(result, {maxDepth: args && args.count ? args.count : 1});
        });
      }),
      multiSelectAction: "forEach",
      handlesCount: true,
      readOnly: true
  }, {
    bindKey: "Command-o|Ctrl-o",
    exec: function(ed, args) {
     // implemented to not trigger open command
    }
  }];

})(THREE.CodeEditor.commands || (THREE.CodeEditor.commands = {}));
