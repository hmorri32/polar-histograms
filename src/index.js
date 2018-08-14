import { CREDENTIALS } from '../credentials';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
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

map.on('zoom', () => {
  map.getZoom() > 14
    ? map.easeTo({ pitch: 40, bearing: -17 })
    : map.easeTo({ pitch: 0, bearing: 0 });
});

map.on('moveend', () => {
  const layerNames = map
    .getStyle()
    .layers.filter(layer => layer['source-layer'] === 'road')
    .map(layer => layer.id);

  const roads = map.queryRenderedFeatures({ layers: layerNames });
})
