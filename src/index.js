import { CREDENTIALS } from '../credentials';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import cheapRuler from 'cheap-ruler';
import lineclip from 'lineclip';

mapboxgl.accessToken = CREDENTIALS.mapboxgl;

const map = new mapboxgl.Map({
  container: 'map',
  // style: 'mapbox://styles/mapbox/outdoors-v9',
  style: 'mapbox://styles/concept3d/cjkvhp2eu2na72sqque0frweq',
  center: [-104.9903, 39.7392],
  zoom: 9,
  hash: true,
});

map.on('load', () => {
  controls();
  hillRgb();
  extrusions();
  update();
  map.on('moveend', () => {
    update();
  });
  map.on('zoom', () => ease());
});

const controls = () => {
  map.addControl(
    new MapboxGeocoder({ accessToken: mapboxgl.accessToken }),
    'top-right'
  );
  map.addControl(new mapboxgl.NavigationControl(), 'top-right');
};

const hillRgb = () => {
  map.addSource('dem', {
    type: 'raster-dem',
    url: 'mapbox://mapbox.terrain-rgb',
  });

  map.addLayer(
    {
      id: 'hillshading',
      source: 'dem',
      type: 'hillshade',
    }
    // 'waterway-river-canal-shadow'
  );
};

const extrusions = () => {
  const la = map.getStyle().layers;
  const layers = la.filter(l => l.type === 'symbol' && l.layout['text-field']);
  const layerId = layers[0].id;

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
};

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

const buildCtx = (ctx, r, bearing) => {
  ctx.save();
  ctx.translate(r, r);
  ctx.rotate((-bearing * Math.PI) / 180);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, 2 * Math.PI, false);
  ctx.fill();
  buildCtxStroke(ctx, r);
};

const buildCtxStroke = (ctx, r) => {
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.lineTo(r, 0);
  ctx.moveTo(0, -r);
  ctx.lineTo(0, r);
  ctx.stroke();
};

const update = () => {
  const h = 350;
  const r = h / 2;
  const numBins = 64;
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.height = h;

  ctx.clearRect(0, 0, h, h);
  buildCtx(ctx, r, map.getBearing());

  const features = getRoadFeatures();
  if (features.length === 0) ctx.restore();

  const ruler = cheapRuler(map.getCenter().lat);
  const bounds = map.getBounds();

  const bbox = [
    bounds.getWest(),
    bounds.getSouth(),
    bounds.getEast(),
    bounds.getNorth(),
  ];

  const bins = new Float64Array(numBins);

  features.forEach((v, i) => {
    const geom = features[i].geometry;
    const lines =
      geom.type === 'LineString' ? [geom.coordinates] : geom.coordinates;

    const clipped = lines.reduce((acc, curr, j) => {
      acc.push.apply(acc, lineclip(lines[j], bbox));
      return acc;
    }, []);

    clipped.forEach((line, j) => {
      const oneWay = features[i].properties.oneway !== 'true';
      analyzeLine(bins, ruler, clipped[j], oneWay);
    });
  });

  // for (const i = 0; i < features.length; i++) {
  //   const geom = features[i].geometry;
  //   const lines =
  //     geom.type === 'LineString' ? [geom.coordinates] : geom.coordinates;

  //   const clipped = lines.reduce((acc, curr, j) => {
  //     acc.push.apply(acc, lineclip(lines[j], bbox));
  //     return acc;
  //   }, []);

  //   clipped.forEach((line, j) => {
  //     const oneWay = features[i].properties.oneway !== 'true';
  //     analyzeLine(bins, ruler, clipped[j], oneWay);
  //   });
  // }

  const binMax = Math.max.apply(null, bins);
  for (let i = 0; i < numBins; i++) {
    const a0 = ((((i - 0.5) * 360) / numBins - 90) * Math.PI) / 180;
    const a1 = ((((i + 0.5) * 360) / numBins - 90) * Math.PI) / 180;
    ctx.fillStyle = '#00005c';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r * Math.sqrt(bins[i] / binMax), a0, a1, false);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
};

const analyzeLine = (bins, ruler, line, isTwoWay) => {
  for (let i = 0; i < line.length - 1; i++) {
    const bearing = ruler.bearing(line[i], line[i + 1]);
    const distance = ruler.distance(line[i], line[i + 1]);

    var k0 = Math.round(((bearing + 360) * 64) / 360) % 64; // main bin
    var k1 = Math.round(((bearing + 180) * 64) / 360) % 64; // opposite bin

    bins[k0] += distance;
    if (isTwoWay) bins[k1] += distance;
    console.log(bins)
  }
};