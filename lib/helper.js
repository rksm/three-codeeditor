function loadUncached(urls, thenDo) {
  if (!urls.length) { thenDo && thenDo(); return; }
  var url = urls.shift();
  var script = document.createElement('script');
  script.src = url + (url.indexOf('?') > -1 ? '&' : '?' + Date.now());
  document.head.appendChild(script);
  script.addEventListener('load', function() { loadUncached(urls, thenDo); });
}

function show(obj) {
  if (!obj) return console.log("SHOW: %s", obj);
  if (obj.show) return obj.show();
  if (obj.x && obj.y && !obj.z) {
    var rect = document.createElement("div");
    var w = 10, h = 10, l = obj.x - w/2, t = obj.y - h/2, color = 'red';
    rect.style.position = "absolute";
    rect.style.left = l + "px";
    rect.style.top = t + "px";
    rect.style.width = w + "px";
    rect.style.height = h + "px";
    rect.style.backgroundColor = color
    document.body.appendChild(rect);
    setTimeout(function() { rect.parentNode.removeChild(rect); }, 3*1000);
    return rect;
  }
  else return console.log("SHOW: %s", lively.lang.obj.inspect(obj, {maxDepth: 4}));
}
