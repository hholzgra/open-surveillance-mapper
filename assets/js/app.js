var selectedFeature, newMarker;

var mapboxStreets = L.tileLayer('https://{s}.tiles.mapbox.com/v4/mapbox.streets/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiYnJ5bWNicmlkZSIsImEiOiJXN1NuOFFjIn0.3YNvR1YOvqEdeSsJDa-JUw', {
  maxZoom: 18,
  attribution: "Map data &copy; <a href='http://openstreetmap.org'>OpenStreetMap</a> contributors, <a href='http://creativecommons.org/licenses/by-sa/2.0/'>CC-BY-SA</a>, Imagery © <a href='http://mapbox.com'>Mapbox</a>"
});

var mapboxHyb = L.tileLayer('https://{s}.tiles.mapbox.com/v4/mapbox.streets-satellite/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiYnJ5bWNicmlkZSIsImEiOiJXN1NuOFFjIn0.3YNvR1YOvqEdeSsJDa-JUw', {
  maxZoom: 18,
  attribution: "Map data &copy; <a href='http://openstreetmap.org'>OpenStreetMap</a> contributors, <a href='http://creativecommons.org/licenses/by-sa/2.0/'>CC-BY-SA</a>, Imagery © <a href='http://mapbox.com'>Mapbox</a>"
});

var map = L.map("map", {
  layers: [mapboxStreets]
}).on("locationfound", function() {
  UIkit.notify.closeAll();
}).fitWorld();

var newHydrantCtrl = L.easyButton("uk-icon-plus",
  function (){
    if (newMarker) {
      map.removeLayer(newMarker);
    }

    newMarker = L.marker(map.getCenter(), {
      icon: L.icon({
        iconUrl: "assets/img/new-marker.png",
        iconSize: [30, 40],
        iconAnchor: [15, 32],
        popupAnchor: [0, -32]
      }),
      draggable: true,
      riseOnHover: true
    }).bindPopup("<div class='new-marker-popup center-block'><b>Drag marker to adjust location.</b><br>Then tap here to enter info.</div>")
      .addTo(map);

    newMarker.openPopup();

    newMarker.on("dragend", function(e) {
      $("#latitude").val(newMarker.getLatLng().lat.toFixed(6));
      $("#longitude").val(newMarker.getLatLng().lng.toFixed(6));
      newMarker.openPopup();
    });

    $("#surveillance-form")[0].reset();
    $("#latitude").val(map.getCenter().lat.toFixed(6));
    $("#longitude").val(map.getCenter().lng.toFixed(6));
    $("#changeset-comment").val("");
    return false;
  },
  "New Surveillance camera"
);

var loadDataCtrl = L.easyButton("uk-icon-refresh",
  function (){
    loadHydrants();
  },
  "Load data"
);

var locateCtrl = L.control.locate({
  position: "topright",
  drawCircle: true,
  follow: true,
  setView: true,
  keepCurrentZoomLevel: false,
  markerStyle: {
    weight: 1,
    opacity: 0.8,
    fillOpacity: 0.8
  },
  circleStyle: {
    weight: 1,
    clickable: false
  },
  icon: "uk-icon-crosshairs",
  iconLoading: "uk-icon-spinner uk-icon-spin",
  metric: false,
  strings: {
    title: "My location",
    popup: "You are within {distance} {unit} from this point",
    outsideMapBoundsMsg: "You seem located outside the boundaries of the map"
  },
  locateOptions: {
    maxZoom: 18,
    watch: true,
    enableHighAccuracy: true,
    maximumAge: 10000,
    timeout: 10000
  }
}).addTo(map);

var vectors = L.layerGroup().addTo(map);

var hydrants = L.geoJson(null, {
  pointToLayer: function (feature, latlng) {
    var iconurl = "assets/img/";

    if (feature.properties.tags['camera:direction']) {
      var direction = parseFloat(feature.properties.tags['camera:direction']);
      var angle = 60.0;
      var rad = 30;


      if (feature.properties.tags['camera:angle']) {
        angle = parseFloat(feature.properties.tags['camera:angle']);
      }

      vectors.addLayer(L.circle(latlng, {radius: rad, weight: 1, color: 'red', fillColor: 'red'}).setDirection(direction, angle));
    } else if (feature.properties.tags['camera:type'] == 'dome') {
      vectors.addLayer(L.circle(latlng, {radius: 30, weight: 1, color: 'red', fillColor: 'red'}));
    }

    switch (feature.properties.tags['surveillance']) {
      case 'public':  iconurl += "public/"; break; 
      case 'outdoor': iconurl += "private/"; break;
      case 'indoor':  iconurl += "indoor/"; break;
      default:        iconurl += "unknown/"; break;  
    }
    switch (feature.properties.tags['camera:type']) {
      case 'dome': iconurl += "dome-camera.png"; break;
      default:     iconurl += "camera.png"; break;
    }
    return L.marker(latlng, {
      icon: L.icon({
        iconUrl: iconurl,
        iconSize: [32, 32],
        iconAnchor: [15, 15]
      }),
      title: feature.properties.id,
      riseOnHover: true
    });
  },
  onEachFeature: function (feature, layer) {
    if (feature.properties) {
      layer.on({
        click: function (e) {
          selectedFeature = L.stamp(layer);
          $("#osm-id").val(feature.properties.id);
          $("#latitude").val(feature.geometry.coordinates[1]);
          $("#longitude").val(feature.geometry.coordinates[0]);
          $("#type").val(feature.properties.tags["surveillance:type"]);
          $("#location").val(feature.properties.tags["surveillance"]);
          $("#cameratype").val(feature.properties.tags["camera:type"]);
          $("#operator").val(feature.properties.tags["operator"]);
          $("#height").val(feature.properties.tags["height"]);
          $("#direction").val(feature.properties.tags["camera:direction"]);
          $("#angle").val(feature.properties.tags["camera:angle"]);
          $("#name").val(feature.properties.tags["name"]);
          $("#note").val(feature.properties.tags["note"]);
          // Get array of standard tags from form
          var standardTags = [];
          $.each( $("#surveillance-form").serializeArray(), function(key, value) {
            if (value.name != "osm-id" && value.name != "man_made" && value.name != "latitude" && value.name != "longitude") {
              standardTags.push(value.name);
            }
          });
          // Append additional tags as simple text inputs
          $(".other-tags").remove();
          $.each(feature.properties.tags, function(key, value) {
            if ($.inArray(key, standardTags) == -1 && key != "man_made") {
              $("#tags").append('<div class="uk-form-row other-tags">'+
                '<label class="uk-form-label" for="' + key + '">' + key + '</label>'+
                '<div class="uk-form-controls">'+
                  '<input type="text" id="' + key + '" class="uk-width-1-1" value="' + value + '">'+
                '</div>'+
              '</div>');
            }
          });
          UIkit.modal("#form-modal").show();
        }
      });
    }
  }
}).addTo(map);

var auth = osmAuth({
  url: 'https://www.openstreetmap.org',
  oauth_secret: "NOmbk3p5u6FFJtPta9IRSORJgSyJ1OoJ86ejCGr3",
  oauth_consumer_key: "Vk2A2gne73wgPXMCHJ69YdT5g6sMjDAOCNw9UBlj",
  auto: true
});

var nominatimSearch = $.UIkit.autocomplete($("#search"), {
  source: function(release) {
    var items = [];
    $.getJSON("http://nominatim.openstreetmap.org/search/" + this.input.val(), {format: "json", addressdetails: "0", polygon_geojson: 1}, function(data) {
      data.forEach(function(item){
       if(item.display_name) {
          items.push(item);
        }
      });
      release(items);
    });
  }
});

$(document).on("click", ".new-marker-popup", function(e) {
  UIkit.modal("#form-modal").show();
});

$("#authenticate,#authorize-btn").click(function() {
  auth.authenticate(function() {
    getUser();
  });
  return false;
});

$("#logout").click(function() {
  auth.logout();
  getUser();
  return false;
});

$("#auth-cancel-btn").click(function() {
  UIkit.modal("#authenticate-modal").hide();
  return false;
});

$("#about-btn").click(function() {
  UIkit.offcanvas.hide("#offcanvas");
  UIkit.modal("#about-modal").show();
  return false;
});

$("#credits-btn").click(function() {
  UIkit.offcanvas.hide("#offcanvas");
  UIkit.modal("#credits-modal").show();
  return false;
});

$("#save-btn").click(function() {
  UIkit.modal("#form-modal").hide();
  createChangeset();
});

$("#cancel-btn").click(function() {
  UIkit.modal("#form-modal").hide();
  $("#surveillance-form")[0].reset();
  $("#changeset-comment").val("");
  map.closePopup();
  if (newMarker) {
    map.removeLayer(newMarker);
  }
});

$("#edit-location-btn").click(function() {
  UIkit.modal("#form-modal").hide();
  if (selectedFeature) {
    marker = map._layers[selectedFeature];
    marker.dragging.enable();
    marker.bindPopup("<div class='new-marker-popup center-block'><b>Drag marker to adjust location.</b><br>Then tap here to enter info.</div>");
    marker.openPopup();
    marker.on("dragend", function(e) {
      $("#latitude").val(marker.getLatLng().lat.toFixed(6));
      $("#longitude").val(marker.getLatLng().lng.toFixed(6));
      marker.openPopup();
    });
  }
});

$("[name=basemap]").change(function() {
  switchBasemap(this.value);
});

$("#geolocate-setting").change(function() {
  if ($(this).prop("checked")) {
    localStorage.setItem("osm-hydrants-autoLocate", 1);
  } else {
    localStorage.setItem("osm-hydrants-autoLocate", 0);
  }
});

$("#autoload-setting").change(function() {
  if ($(this).prop("checked")) {
    localStorage.setItem("osm-hydrants-autoload", 1);
    loadHydrants();
    map.on("moveend", loadHydrants);
  } else {
    localStorage.setItem("osm-hydrants-autoload", 0);
    map.off("moveend", loadHydrants);
  }
});

$(function() {
  /* Webshim polyfill required for datalist functionality */
  webshims.setOptions("forms", {
    replaceValidationUI: true,
    lazyCustomMessages: true,
    customDatalist: "auto",
    list: {
      "filter": "^",
      "focus": true,
      "highlight": true
    }
  });
  webshims.polyfill("forms forms-ext");

  if (auth.authenticated()) {
    getUser();
  } else {
    UIkit.modal("#authenticate-modal").show();
  }

  /* Check user settings */
  if (!localStorage.getItem("osm-hydrants-autoLocate") || localStorage.getItem("osm-hydrants-autoLocate") == 1) {
    UIkit.notify({
      message: "<i class='uk-icon-refresh uk-icon-spin'></i>&nbsp;&nbsp;Finding your location...",
      status: "info",
      timeout: 0,
      pos: "bottom-center"
    });
    locateCtrl.start();
  } else {
    $("#geolocate-setting").attr("checked", false);
  }

  if (!localStorage.getItem("osm-hydrants-autoload") || localStorage.getItem("osm-hydrants-autoload") == 1) {
    if (map.getZoom() > 15) {
      loadHydrants();
    }
    map.on("moveend", loadHydrants);
    $("#autoload-setting").attr("checked", true);
  }
});

function getUser() {
  if (auth.authenticated()) {
    auth.xhr({
      method: "GET",
      path: "/api/0.6/user/details"
    }, function(err, details) {
      var user = details.getElementsByTagName("user")[0].getAttribute("display_name");
      $("#logout").html('<i class="uk-icon-user"></i> Log out <span class="uk-text-bold">' + user + '</span>').show();
      $("#user").html("<a href='http://www.openstreetmap.org/user/"+user+"'>"+user+"</a>");
      $("#authenticate").hide();
      UIkit.modal("#authenticate-modal").hide();
    });
  } else {
    $("#logout").hide();
    $("#authenticate").show();
  }
}

function loadHydrants() {
  if (map.getZoom() > 15) {
    UIkit.notify({
      message: "<i class='uk-icon-refresh uk-icon-spin'></i>&nbsp;&nbsp;Loading data...",
      status: "info",
      timeout: 0,
      pos: "bottom-center"
    });
    hydrants.clearLayers();
    vectors.clearLayers();
    var bounds = map.getBounds().pad(0.25);
    $.ajax({
      url: "https://overpass-api.de/api/interpreter?data=[out:json];node("+bounds.toBBoxString().split(",")[1]+","+bounds.toBBoxString().split(",")[0]+","+bounds.toBBoxString().split(",")[3]+","+bounds.toBBoxString().split(",")[2]+")['man_made'='surveillance'];out+meta;",
      dataType: "json",
      success: function (json) {
        var osm = osmtogeojson(json);
        $.each(osm.features, function(index, feature) {
          $.each(feature.properties.tags, function(tag, value) {
            if (tag == "man_made" && value == "surveillance") {
              hydrants.addData(feature);
            }
          });
        });
        UIkit.notify.closeAll();
      }
    });
  } else{
    UIkit.notify({
      message: "<i class='uk-icon-search-plus'></i>&nbsp;&nbsp;Zoom in to load data",
      status: "info",
      timeout: 2000,
      pos: "bottom-center"
    });
  }
}

function mapZoom(a,b,c,d) {
  map.fitBounds([[a,c],[b,d]], {
    maxZoom: 17
  });
  UIkit.offcanvas.hide("#offcanvas");
}

function switchBasemap(type) {
  if (type == "sat") {
    map.removeLayer(mapboxStreets);
    map.addLayer(mapboxHyb);
    $("#sat-layer").css("background-color", "#5cb85c").css("color", "white");
    $("#osm-layer").css("background-color", "").css("color", "");
  }
  if (type == "map") {
    map.removeLayer(mapboxHyb);
    map.addLayer(mapboxStreets);
    $("#osm-layer").css("background-color", "#5cb85c").css("color", "white");
    $("#sat-layer").css("background-color", "").css("color", "");
  }
  UIkit.offcanvas.hide("#offcanvas");
}

/* Begin OSM API update */
function createChangeset() {
  UIkit.notify({
    message: "<i class='uk-icon-refresh uk-icon-spin'></i>&nbsp;&nbsp;Uploading changes to OpenStreetMap...",
    status: "info",
    timeout: 0,
    pos: "bottom-center"
  });
  var newChangeset = "<osm>" +
    "<changeset>" +
      "<tag k='created_by' v='Open Surveillance Mapper'/>" +
      "<tag k='comment' v='" + $("#changeset-comment").val() + "'/>" +
    "</changeset>" +
  "</osm>";
  auth.xhr({
    method: "PUT",
    path: "/api/0.6/changeset/create",
    options: {
      header: {
        "Content-Type": "text/xml"
      }
    },
    content: newChangeset
  }, function(err, changeset_id) {
    if (err) {
      UIkit.modal.alert("Error creating the changeset. Please try again.");
      UIkit.notify.closeAll();
    } else {
      uploadNode(changeset_id);
    }
  });
}

function uploadNode(changeset_id) {
  var osmID, nodeType, version, node;
  $.each($("#surveillance-form").serializeArray(), function(index, tag) {
    if (tag.name === "osm-id") {
      if (tag.value.length > 0) {
        osmID = tag.value;
        nodeType = "existing";
        version = map._layers[selectedFeature].feature.properties.meta.version;
        node = "<osmChange><modify>";
      } else {
        osmID = "-1";
        nodeType = "new";
        version = "0";
        node = "<osmChange><create>";
      }
      node += "<node id='" + osmID + "' lon='" + $("#longitude").val() + "' lat='" + $("#latitude").val() + "' version='" + version + "' changeset='" + changeset_id + "'><tag k='man_made' v='surveillance'/>";
    } else if (tag.value.length > 0 && tag.name !== "latitude" && tag.name !== "longitude") {
      node += "<tag k='" + tag.name + "' v='" + tag.value + "'/>";
    }
  });
  if (nodeType == "existing") {
    node += "</node></modify><delete if-unused='true'/></osmChange>";
  } else {
    node += "</node></create><delete if-unused='true'/></osmChange>";
  }
  auth.xhr({
    method: "POST",
    path: "/api/0.6/changeset/" + changeset_id + "/upload",
    options: {
      header: {
        "Content-Type": "text/xml"
      }
    },
    content: node
  }, function(err) {
    if (err) {
      UIkit.modal.alert("Error uploading the changeset. Please try again.");
      UIkit.notify.closeAll();
    } else {
      auth.xhr({
        method: "PUT",
        path: "/api/0.6/changeset/" + changeset_id + "/close",
      }, function(err, result) {
        if (err) {
          UIkit.modal.alert("Error closing the changeset. Please try again.");
          UIkit.notify.closeAll();
        } else {
          $("#facebook-share-btn").attr("href", "https://facebook.com/sharer/sharer.php?u=http://www.openstreetmap.org/changeset/" + changeset_id);
          $("#twitter-share-btn").attr("href", "https://twitter.com/intent/tweet?source=webclient&hashtags=OpenHydrantMapper&text=" + $("#changeset-comment").val() + "%20http://www.openstreetmap.org/changeset/" + changeset_id);
          $("#gplus-share-btn").attr("href", "https://plus.google.com/share?url=http://www.openstreetmap.org/changeset/" + changeset_id);
          UIkit.notify.closeAll();
          UIkit.modal("#share-modal").show();
          $("#surveillance-form")[0].reset();
          $("#changeset-comment").val("");
          if (newMarker) {
            map.removeLayer(newMarker);
          }
          loadHydrants();
        }
      });
    }
  });
}
/* End OSM API upload */
