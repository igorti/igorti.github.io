var map;

function init() {
  map = L.map('map').setView([38.68551, -36.38672], 3);

  var bgMap = "https://api.tiles.mapbox.com/v4/mapbox.outdoors/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiaWdvcnRpIiwiYSI6IkROMTNFa00ifQ.pvVGeuMJHy973-6SK8LJkA";
  L.tileLayer(bgMap, { maxZoom: 18 }).addTo(map);

  addMarkers();
}

function addMarkers() {
  var markers = new L.MarkerClusterGroup();

  for (var i = 0; i < geojson.features.length; i++) {
    var f = geojson.features[i];

    if (f.geometry) {
      var marker = new L.marker(
        new L.LatLng(f.geometry.coordinates[1], f.geometry.coordinates[0]), { id: f.properties.id }
      );

      marker.on('click', showRunPath);
      markers.addLayer(marker);
    }
  }

  map.addLayer(markers);
}

function showRunPath(event) {
  var geojsonPath;

  for (var i = 0; i < geojson.features.length; i++) {
    var f = geojson.features[i];

    if (f.properties.id === event.target.options.id) {
      geojsonPath = f;
      break;
    }
  }

  if (geojsonPath) {
    if (!(geojsonPath.geometry.coordinates[0] instanceof Array) ) {
      var minifier = new GeojsonMinifier({ precision: 6 });
      geojsonPath.geometry.coordinates = minifier.decodeGeometry(geojsonPath.geometry.coordinates);
    }

    map.fitBounds(new L.GeoJSON(geojsonPath).getBounds());

    var duration = geojsonPath.properties.distance < 15 ? 8000 : 15000;

    drawPath(geojsonPath, duration);

    updateDahsboard(geojsonPath.properties);
  }
}

function updateDahsboard(data) {
  document.getElementById('dashboard').style.display = 'block'
  document.getElementById('locality').innerText = data.locality;
  document.getElementById('date').innerText = data.start_time.split(' ')[0];

  var totalMinutes = data.run_time.split(":")[0];
  var hours = Math.floor(totalMinutes / 60);

  var minutes = totalMinutes % 60;
  minutes = minutes < 10 ? "0" + minutes : minutes;

  var seconds = data.run_time.split(":")[1];
  seconds = seconds < 10 ? "0" + seconds : seconds;

  document.getElementById('time').innerText = "0" + hours + ":" + minutes + ":" + seconds;

  var meters = data.distance*1000,
      i = 0,
      timeout = Math.floor((3000 / meters) * 10);

  var distanceLabel = document.querySelector('#distance > span');

  function printText() {
    distanceLabel.innerText = i;
    i += 202;

    if (i < meters) {
      setTimeout(printText, timeout);
    } else {
      distanceLabel.innerText = meters;
    }
  }

  printText();
}

function drawPath(geojsonPath, duration) {
  var pane = d3.select(map.getPanes().overlayPane);
  pane.selectAll("svg.running-path").remove();

  var svg = pane.append("svg").attr("class", "running-path"),
      g = svg.append("g").attr("class", "leaflet-zoom-hide");

  var transform = d3.geo.transform({point: projectPoint});
  var path = d3.geo.path().projection(transform);

  var collection = { type: "FeatureCollection", features: [geojsonPath]};

  var line = g.selectAll(".line")
                .data([geojsonPath])
                .enter()
                .append("path")
                .attr("class", "line");

  function reset() {
    var bounds = path.bounds(collection),
        topLeft = bounds[0],
        bottomRight = bounds[1];

    topLeft[0] -= 2;
    topLeft[1] -= 2;
    bottomRight[0] += 2;
    bottomRight[1] += 2;

    svg.attr("width", bottomRight[0] - topLeft[0] + 6)
        .attr("height", bottomRight[1] - topLeft[1] + 6)
        .style("left", topLeft[0] + "px")
        .style("top", topLeft[1] + "px");

    g.attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");

    line.attr("d", path).call(transition);
  }

  function transition(path) {

    path.transition()
        .duration(duration)
        .attrTween("stroke-dasharray", tweenDash)
  }

  function tweenDash() {
    var l = this.getTotalLength(),
        i = d3.interpolateString("0," + l, l + "," + l);
    return function(t) { return i(t); };
  }

  map.on("viewreset", reset);
  reset(line, path);
}

function projectPoint(x, y) {
  var point = map.latLngToLayerPoint(new L.LatLng(y, x));
  this.stream.point(point.x, point.y);
}

window.onload = init();
