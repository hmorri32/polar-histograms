import { CREDENTIALS } from '../credentials';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import cheapRuler from 'cheap-ruler';

mapboxgl.accessToken = CREDENTIALS.mapboxgl;

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/outdoors-v9',
  center: [-104.9903, 39.7392],
  zoom: 9,
  hash: true,
});

map.addControl(
  new MapboxGeocoder({ accessToken: mapboxgl.accessToken }),
  'top-right'
);

map.addControl(new mapboxgl.NavigationControl(), 'top-right');

map.on('load', function() {
  const la = map.getStyle().layers;
  const layers = la.filter(l => l.type === 'symbol' && l.layout['text-field']);
  const layerId = layers[0].id;

  map.addSource('dem', {
    type: 'raster-dem',
    url: 'mapbox://mapbox.terrain-rgb',
  });

  map.addLayer(
    {
      id: 'hillshading',
      source: 'dem',
      type: 'hillshade',
    },
    'waterway-river-canal-shadow'
  );

  map.addLayer(
    {
      id: '3d-buildings',
      source: 'composite',
      'source-layer': 'building',
      filter: ['==', 'extrude', 'true'],
      type: 'fill-extrusion',
      minzoom: 12,
      paint: {
        'fill-extrusion-color': '#FFFFFF',
        'fill-extrusion-height': [
          'interpolate',
          ['linear'],
          ['zoom'],
          15,
          0,
          15.05,
          ['get', 'height'],
        ],
        'fill-extrusion-base': [
          'interpolate',
          ['linear'],
          ['zoom'],
          15,
          0,
          15.05,
          ['get', 'min_height'],
        ],
        'fill-extrusion-opacity': 0.6,
      },
    },
    layerId
  );
});

map.on('zoom', () => ease());

map.on('moveend', () => {
  const feats = getRoadFeatures();
  updateOrientation();
});

const getRoadFeatures = () => {
  const layerNames = map
    .getStyle()
    .layers.filter(layer => layer['source-layer'] === 'road')
    .map(layer => layer.id);

  return map.queryRenderedFeatures({ layers: layerNames });
};

const ease = () => {
  map.getZoom() > 16
    ? map.easeTo({ pitch: 40, bearing: -17 })
    : map.easeTo({ pitch: 0, bearing: 0 });
};

const height = 300;
const radius = height / 2;
const num = 64;
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.style.width = canvas.style.height = height + 'px';
canvas.width = canvas.height = height;

const updateOrientation = () => {
  ctx.clearRect(0, 0, height, height);

  const bearing = map.getBearing();

  ctx.save();
  ctx.translate(radius, radius);
  ctx.rotate((-bearing * Math.pi) / 100);

  ctx.fillStyle = '#bada55';
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, 2 * Math.PI, false);
  ctx.fill();


  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.moveTo(-radius, 0);
  ctx.lineTo(radius, 0);
  ctx.moveTo(0, -radius);
  ctx.lineTo(0, radius);
  ctx.stroke();

  const features = getRoadFeatures();
  const ruler = cheapRuler(map.getCenter().lat);
  const bounds = map.getBounds();

  const box = [
    bounds.getWest(),
    bounds.getSouth(),
    bounds.getNorth(),
    bounds.getEast(),
  ];
  const bins = new Float64Array(num)

  console.log(bins)



};



























// var h = 300; // size of the chart canvas
// var r = h / 2; // radius of the polar histogram
// var numBins = 64; // number of orientation bins spread around 360 deg.

// var canvas = document.getElementById('canvas');
// var ctx = canvas.getContext('2d');

// canvas.style.width = canvas.style.height = h + 'px';
// canvas.width = canvas.height = h;

// if (window.devicePixelRatio > 1) {
//   canvas.width = canvas.height = h * 2;
//   ctx.scale(2, 2);
// }

// function updateOrientations() {
//   ctx.clearRect(0, 0, h, h);

//   var bearing = map.getBearing();

//   ctx.save();
//   ctx.translate(r, r);
//   ctx.rotate((-bearing * Math.PI) / 180);

//   ctx.fillStyle = 'rgba(255,255,255,0.8)';
  // ctx.beginPath();
  // ctx.arc(0, 0, r, 0, 2 * Math.PI, false);
  // ctx.fill();

//   ctx.strokeStyle = 'rgba(0,0,0,0.15)';
//   ctx.beginPath();
//   ctx.moveTo(-r, 0);
//   ctx.lineTo(r, 0);
//   ctx.moveTo(0, -r);
//   ctx.lineTo(0, r);
//   ctx.stroke();

//   var features = map.queryRenderedFeatures({ layers: ['road'] });
//   if (features.length === 0) {
//     ctx.restore();
//     return;
//   }

//   var ruler = cheapRuler(map.getCenter().lat);
//   var bounds = map.getBounds();
//   var bbox = [
//     bounds.getWest(),
//     bounds.getSouth(),
//     bounds.getEast(),
//     bounds.getNorth(),
//   ];
//   var bins = new Float64Array(numBins);

//   for (var i = 0; i < features.length; i++) {
//     var geom = features[i].geometry;
//     var lines =
//       geom.type === 'LineString' ? [geom.coordinates] : geom.coordinates;

//     // clip lines to screen bbox for more exact analysis
//     var clippedLines = [];
//     for (var j = 0; j < lines.length; j++) {
//       clippedLines.push.apply(clippedLines, lineclip(lines[j], bbox));
//     }

//     // update orientation bins from each clipped line
//     for (j = 0; j < clippedLines.length; j++) {
//       analyzeLine(
//         bins,
//         ruler,
//         clippedLines[j],
//         features[i].properties.oneway !== 'true'
//       );
//     }
//   }

//   var binMax = Math.max.apply(null, bins);

//   for (i = 0; i < numBins; i++) {
//     var a0 = ((((i - 0.5) * 360) / numBins - 90) * Math.PI) / 180;
//     var a1 = ((((i + 0.5) * 360) / numBins - 90) * Math.PI) / 180;
//     ctx.fillStyle = interpolateSinebow(((2 * i) % numBins) / numBins);
//     ctx.beginPath();
//     ctx.moveTo(0, 0);
//     ctx.arc(0, 0, r * Math.sqrt(bins[i] / binMax), a0, a1, false);
//     ctx.closePath();
//     ctx.fill();
//   }

//   ctx.restore();
// }

// function analyzeLine(bins, ruler, line, isTwoWay) {
//   for (var i = 0; i < line.length - 1; i++) {
//     var bearing = ruler.bearing(line[i], line[i + 1]);
//     var distance = ruler.distance(line[i], line[i + 1]);

//     var k0 = Math.round(((bearing + 360) * numBins) / 360) % numBins; // main bin
//     var k1 = Math.round(((bearing + 180) * numBins) / 360) % numBins; // opposite bin

//     bins[k0] += distance;
//     if (isTwoWay) bins[k1] += distance;
//   }
// }

// // rainbow colors for the chart http://basecase.org/env/on-rainbows
// function interpolateSinebow(t) {
//   t = 0.5 - t;
//   var r = Math.floor(250 * Math.pow(Math.sin(Math.PI * (t + 0 / 3)), 2));
//   var g = Math.floor(250 * Math.pow(Math.sin(Math.PI * (t + 1 / 3)), 2));
//   var b = Math.floor(250 * Math.pow(Math.sin(Math.PI * (t + 2 / 3)), 2));
//   return 'rgb(' + r + ',' + g + ',' + b + ')';
// }

// map.on('load', function() {
//   updateOrientations();
//   // update the chart on moveend; we could do that on move,
//   // but this is slow on some zoom levels due to a huge amount of roads
//   map.on('moveend', updateOrientations);
// });
