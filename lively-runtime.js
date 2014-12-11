lively.require("lively.lang.Runtime").toRun(function() {

  var r = lively.lang.Runtime.Registry;
  r.addProject(r.default(), {
    name: "three-codeeditor",
    rootDir: "/Users/robert/Lively/website/public/three-codeeditor",

    resources: {

      "stuff": {
        matches: /three-codeeditor\/lively-runtime\.js$/,
        changeHandler: function(change, project, resource) {
  				evalCode(change.newSource, {}, change.resourceId);
        }
      },

      "editor code": {
        matches: /three-codeeditor\/.*\.js$/,
        changeHandler: function(change, project, resource) {
  				evalCodeRemote(change.newSource, {}, change.resourceId);
        }
      }

    }
  });

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

  function evalCode(code, state, resourceName, thenDo) {
    lively.lang.VM.runEval(code,
      {topLevelVarRecorder: state, context: state, sourceURL: resourceName},
      function(err, result) {
    		err && show("error when updating the runtime for " + resourceName + "\n" + (err.stack || err));
    		!err && alertOK("runtime updated for " + resourceName);
    	});
  }

  function evalCodeRemote(code, state, resourceName, thenDo) {
    $morph("Lively2LivelyWorkspace").get("editor")
      .remoteEval(code, function(err, result) {
        		err && show("error when updating the runtime for " + resourceName + "\n" + (err.stack || err));
        		!err && alertOK("remote runtime updated for " + resourceName);
    		thenDo && thenDo(err, result);
    });
  }
});
