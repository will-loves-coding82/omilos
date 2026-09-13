"use client";

import Map, { NavigationControl, MapRef, GeolocateControl, Marker, Popup, Layer } from 'react-map-gl/mapbox';
import type { FillExtrusionLayerSpecification } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css'; // Don't forget the CSS!
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { SearchBoxRetrieveResponse } from '@mapbox/search-js-core';
import { environment } from './environments/environment';

const SearchBox = dynamic(
  () => import("@mapbox/search-js-react").then((mod) => mod.SearchBox),
  { ssr: false }
);

type Coordinates = {
  lon?: number,
  lat?: number
}

// Extrudes building footprints from Mapbox's built-in composite source into 3D shapes.
// Requires the map's `pitch` to be > 0 to actually see the height.
const buildingExtrusionLayer: FillExtrusionLayerSpecification = {
  id: '3d-buildings',
  source: 'composite',
  'source-layer': 'building',
  filter: ['==', 'extrude', 'true'],
  type: 'fill-extrusion',
  minzoom: 14,
  paint: {
    'fill-extrusion-color': '#aaa',
    'fill-extrusion-height': ['get', 'height'],
    'fill-extrusion-base': ['get', 'min_height'],
    'fill-extrusion-opacity': 0.6,
  },
};

export default function HangoutDetailsClient() {
  const mapRef = useRef<MapRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapInstanceReady, setMapInstanceReady] = useState(false);
  const [viewState, setViewState] = useState({ longitude: -74.5, latitude: 40, zoom: 12, pitch: 40});
  
  const [eventStops, setEventStops] = useState([]); // TODO: Add type
  const [searchSelectedResponse, setSearchSelectedResponse] = useState<SearchBoxRetrieveResponse | null>(null);
  const [searchMarkerCoord, setSearchMarkerCoord] = useState<Coordinates|null>(null);
  const [showSearchMarkerPopup, setShowSearchMarkerPopup] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Track OS color scheme so the map style can switch with it
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // When component mounts, the map will center on the user coordinates
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => {
        const userLon = position.coords.longitude;
        const userLat = position.coords.latitude;

        setViewState(v => ({ ...v, longitude: userLon, latitude: userLat }));
      }, (error) => {
        console.error("Gelocation error: " + error)
      })
    }
  }, []);

  //Initialize the map and attach a resize observer
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      mapRef.current?.getMap().resize();
    });
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);


  // Update the search marker everytime
  useEffect(() => {
    if (searchSelectedResponse) {
      const coord = searchSelectedResponse.features[0].geometry.coordinates
      setSearchMarkerCoord({lon: coord[0], lat: coord[1]})
    }
  }, [searchSelectedResponse])

  return (
    <div ref={containerRef} className='fixed inset-0 z-0'>
      <div
        className='max-w-md absolute top-4 z-10 w-[calc(100%-5rem)] left-1/2 -translate-x-1/2 md:left-[calc(var(--sidebar-width)+1rem)] md:translate-x-0 md:w-80 transition-[left] duration-300'
      >
        {mapInstanceReady && (
          <SearchBox
          onChange={(s)=>{
            if (s.length === 0) {
              setSearchMarkerCoord(null);
                setShowSearchMarkerPopup(false);
              }
            }}
            onClear={()=> {
                setSearchMarkerCoord(null);
                setShowSearchMarkerPopup(false);
            }}
            theme={{
              variables: {
                colorPrimary: '#0ea5e9',
                colorSecondary: '#64748b',
                colorBackground: '#ffffff',
                colorBackgroundHover: '#f1f5f9',
                colorText: '#0f172a',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                fontFamily: 'inherit',

                unit: '14px',
                padding: '0.75em',
              }
            }}
            accessToken={environment.mapbox.accessToken ?? ""}
            map={mapRef.current!.getMap()}
            onRetrieve={(res) => {
              setSearchSelectedResponse(res);
            }}
          />
        )}
      </div>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onLoad={() => setMapInstanceReady(true)}
        mapboxAccessToken={environment.mapbox.accessToken}
        mapStyle={isDarkMode ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v11'}
        style={{ width: '100%', height: '100%' }}
      >
         <GeolocateControl
          position="top-right"
          style={{
            marginTop: "1rem",
            height: "38px",
            width: "38px",
            display: "flex",
            justifyContent:"center",
            alignItems: "center",
            borderColor: "none",
            borderRadius: "6px"
          }}
          trackUserLocation={true}
          showUserLocation={true}
        />
        <Layer {...buildingExtrusionLayer} />
        { searchMarkerCoord && (
          <>
            { showSearchMarkerPopup && (
              <Popup
                className='hangout-popup'
                anchor='bottom'
                onClose={()=> setShowSearchMarkerPopup(false)}
                longitude={searchMarkerCoord.lon!}
                latitude={searchMarkerCoord.lat!}
              >
                <p>Selected location</p>
              </Popup>
            )}
            <Marker onClick={(e) => {
              e.originalEvent.stopPropagation();
              setShowSearchMarkerPopup(true);
            }} color="#0662db" longitude={searchMarkerCoord.lon!} latitude={searchMarkerCoord.lat!}/>
          </>
        )}
        <NavigationControl position='bottom-right' />
      </Map>
    </div>
  )
}
