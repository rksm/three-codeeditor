;(function(exports) {

  // imports
  var oop = ace.require("ace/lib/oop");
  var fun = lively.lang.fun;
  var AutoComplete = ace.require("ace/autocomplete").Autocomplete;
  var FilteredList = ace.require("ace/autocomplete").FilteredList;

  // exports
  exports.installDynamicJSCompleterInto = installDynamicJSCompleterInto;

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

  function installDynamicJSCompleterInto(aceEditor) {

    var completer = {
      isDynamicJSCompleter: true,

      getCompletions: function(editor, session, pos, prefix, thenDo) {

        var result = dynamicCompleter.getCompletions(
          getSelectionOrLineString(editor, pos),
          function(code) {
            var evaled = lively.vm.syncEval(code, {topLevelVarRecorder: {}, sourceURL: "completions-"+Date.now()});
            return evaled instanceof Error ? null : evaled;
          });

        if (!result || !result.completions) return thenDo(null, []);

        thenDo(null, result.completions.reduce(function(completions, group) {
          var groupName = lively.lang.string.truncate(group[0], 20);
          return completions.concat(group[1].map(function(compl) {
            return {
              caption: "[" + groupName+ "] " + compl,
              value: compl, score: 210, meta: "dynamic",
              completer: compl[0] !== "[" ? null : {
                insertMatch: function(ed, completion) {
                  var pos = ed.getCursorPosition();
                  var dotRange = ed.find(".", {
                    start: ed.getCursorPosition(),
                    preventScroll: true, backwards: true
                  });
                  if (dotRange.start.row === pos.row) {
                    // remove everything until (including) the "." before inserting completion
                    ed.session.replace({start: dotRange.start, end: pos}, "");
                  }
                  ed.execCommand("insertstring", completion.value || completion);
                }
              }
            }
          }))
        }, []));

        // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
        function getSelectionOrLineString(ed, pos) {
          var range = ed.selection.getRange()
          if (range.isEmpty())
            range = ed.selection.getLineRange(pos.row, true);
          return ed.session.getTextRange(range);
        }
      }
    }

    aceEditor.completers = (aceEditor.completers || [])
      .filter(function(ea) { return !ea.isDynamicJSCompleter; })
      .concat([completer]);

  };

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // dynamic JavaScript completer
  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-

  // FIXME this should go into lively.vm!
  var dynamicCompleter = {

      getCompletions: function(code, evalFunc) {
          var err, completions
          getCompletions(evalFunc, code, function(e, c, pre) {
              err = e, completions = {prefix: pre, completions: c}; })
          if (err) { alert(err); return {error: String(err.stack || err), prefix: '', completions: []}; }
          else return completions;
  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // rk 2013-10-10 I extracted the code below into a nodejs module (since this
  // stuff is also useful on a server and in other contexts). Right now we have no
  // good way to load nodejs modules into Lively and I inline the code here. Please
  // fix soon!
  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // helper
  function signatureOf(name, func) {
      var source = String(func),
          match = source.match(/function\s*[a-zA-Z0-9_$]*\s*\(([^\)]*)\)/),
          params = (match && match[1]) || '';
      return makeValidCompletion(name) + '(' + params + ')';
  }

  function isClass(obj) {
      if (obj === obj
        || obj === Array
        || obj === Function
        || obj === String
        || obj === Boolean
        || obj === Date
        || obj === RegExp
        || obj === Number) return true;
      return (obj instanceof Function)
          && ((obj.superclass !== undefined)
           || (obj._superclass !== undefined));
  }

  function pluck(list, prop) { return list.map(function(ea) { return ea[prop]; }); }

  function getObjectForCompletion(evalFunc, stringToEval, thenDo) {
      // thenDo = function(err, obj, startLetters)
      var idx = stringToEval.lastIndexOf('.'),
          startLetters = '';
      if (idx >= 0) {
          startLetters = stringToEval.slice(idx+1);
          stringToEval = stringToEval.slice(0,idx);
      } else {
          startLetters = stringToEval;
          stringToEval = 'Global';
      }
      var completions = [];
      try {
          var obj = evalFunc(stringToEval);
      } catch (e) { thenDo(e, null, null); }
      thenDo(null, obj, startLetters);
  }

  function propertyExtract(excludes, obj, extractor) {
      // show(''+excludes)
      return Object.getOwnPropertyNames(obj)
          .filter(function(key) { return excludes.indexOf(key) === -1; })
          .map(extractor)
          .filter(function(ea) { return !!ea; })
          .sort(function(a,b) {
              return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0); });
  }

  function isValidIdentifier(string) {
    // FIXME real identifier test is more complex...
    return /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(string);
  }

  function makeValidCompletion(string) {
    return isValidIdentifier(string) ? string : "['" + string.replace(/'/g, "\\'") + "']";
  }

  function getMethodsOf(excludes, obj) {
      return propertyExtract(excludes, obj, function(key) {

          if ((obj.__lookupGetter__ && obj.__lookupGetter__(key)) || typeof obj[key] !== 'function') return null;
          return {name: key, completion: signatureOf(key, obj[key])}; })
  }

  function getAttributesOf(excludes, obj) {
      return propertyExtract(excludes, obj, function(key) {
          if ((obj.__lookupGetter__ && !obj.__lookupGetter__(key)) && typeof obj[key] === 'function') return null;
          return {name: key, completion: makeValidCompletion(key)}; })
  }

  function getProtoChain(obj) {
      var protos = [], proto = obj;
      while (obj) { protos.push(obj); obj = obj.__proto__ }
      return protos;
  }

  function getDescriptorOf(originalObj, proto) {
      function shorten(s, len) {
          if (s.length > len) s = s.slice(0,len) + '...';
          return s.replace(/\n/g, '').replace(/\s+/g, ' ');
      }

      var stringified;
      try { stringified = String(originalObj); } catch (e) { stringified = "{/*...*/}"; }

      if (originalObj === proto) {
          if (typeof originalObj !== 'function') return shorten(stringified, 50);
          var funcString = stringified,
              body = shorten(funcString.slice(funcString.indexOf('{')+1, funcString.lastIndexOf('}')), 50);
          return signatureOf(originalObj.displayName || originalObj.name || 'function', originalObj) + ' {' + body + '}';
      }

      var klass = proto.hasOwnProperty('constructor') && proto.constructor;
      if (!klass) return 'prototype';
      if (typeof klass.type === 'string' && klass.type.length) return shorten(klass.type, 50);
      if (typeof klass.name === 'string' && klass.name.length) return shorten(klass.name, 50);
      return "anonymous class";
  }

  function getCompletionsOfObj(obj, thenDo) {
      if (!obj) return thenDo(null, []);
      var err, completions;
      try {
          var excludes = [];
          completions = getProtoChain(obj).map(function(proto) {
              var descr = getDescriptorOf(obj, proto),
                  methodsAndAttributes = getMethodsOf(excludes, proto)
                      .concat(getAttributesOf(excludes, proto));
              excludes = excludes.concat(pluck(methodsAndAttributes, 'name'));
              return [descr, pluck(methodsAndAttributes, 'completion')];
          });
      } catch (e) { err = e; }
      thenDo(err, completions);
  }

  function getCompletions(evalFunc, string, thenDo) {
      // thendo = function(err, completions/*ARRAY*/)
      // eval string and for the resulting object find attributes and methods,
      // grouped by its prototype / class chain
      // if string is something like "foo().bar.baz" then treat "baz" as start
      // letters = filter for properties of foo().bar
      // ("foo().bar.baz." for props of the result of the complete string)
      getObjectForCompletion(evalFunc, string, function(err, obj, startLetters) {
          if (err) { thenDo(err); return }
          var excludes = [];
          var completions = getProtoChain(obj).map(function(proto) {
              var descr = getDescriptorOf(obj, proto),
                  methodsAndAttributes = getMethodsOf(excludes, proto)
                      .concat(getAttributesOf(excludes, proto));
              excludes = excludes.concat(pluck(methodsAndAttributes, 'name'));
              return [descr, pluck(methodsAndAttributes, 'completion')];
          });
          thenDo(err, completions, startLetters);
      })
  }

  /*
  ;(function testCompletion() {
      function assertCompletions(err, completions, prefix) {
          assert(!err, 'getCompletions error: ' + err);
          assert(prefix === '', 'prefix: ' + prefix);
          assert(completions.length === 3, 'completions does not contain 3 groups ' + completions.length)
          assert(completions[2][0] === 'Object', 'last completion group is Object')
          objectCompletions = completions.slice(0,2)
          expected = [["[object Object]", ["m1(a)","m2(x)","a"]],
                      ["prototype", ["m3(a,b,c)"]]]
          assert(Objects.equals(expected, objectCompletions), 'compl not equal');
          alertOK('all good!')

      }
      function evalFunc(string) { return eval(string); }
      var code = "obj1 = {m2: function() {}, m3:function(a,b,c) {}}\n"
               + "obj2 = {a: 3, m1: function(a) {}, m2:function(x) {}, __proto__: obj1}\n"
               + "obj2."
      getCompletions(evalFunc, code, assertCompletions)
  })();
  */
      }
  };

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // ace extensions
  // -=-=-=-=-=-=-=-

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
      }, 20);

      this.popup.renderer.container.style.zIndex=-1000;
      this.popup.setFontSize(editor.getFontSize()-3);


      var parentEditor = editor.parent3d;
      var popupEditor3d = this.popupEditor3d;
      if (!popupEditor3d) {
        popupEditor3d = this.popupEditor3d = new THREE.CodeEditor(
          world.renderer.domElement, parentEditor.events,
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


  AutoComplete.prototype.commands = lively.lang.obj.merge(AutoComplete.prototype.commands, {
    "Alt-Shift-,": function(editor) { editor.completer.goTo("start"); },
    "Alt-Shift-.": function(editor) { editor.completer.goTo("end"); },
    "Alt-V": function(editor) { editor.completer.popup.gotoPageUp(); },
    "Ctrl-V": function(editor) { editor.completer.popup.gotoPageDown(); }
  });

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // helper functions
  // -=-=-=-=-=-=-=-=-

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

})(THREE.CodeEditor.autocomplete || (THREE.CodeEditor.autocomplete = {}));
