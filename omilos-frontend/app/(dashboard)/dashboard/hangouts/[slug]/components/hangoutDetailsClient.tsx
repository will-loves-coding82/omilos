"use client";

import Map, { NavigationControl, MapRef, GeolocateControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css'; // Don't forget the CSS!
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { environment } from './environments/environment';

const SearchBox = dynamic(
  () => import("@mapbox/search-js-react").then((mod) => mod.SearchBox),
  { ssr: false }
);

type LocationState = {
  lon: number,
  lat: number
}

export default function HangoutDetailsClient() {
  const mapRef = useRef<MapRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewState, setViewState] = useState({
    longitude: -74.5,
    latitude: 40,
    zoom: 12,
  });
  const [mapInstanceReady, setMapInstanceReady] = useState(false);

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

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      mapRef.current?.getMap().resize();
    });
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div ref={containerRef} className='relative w-full h-full'>
      <div className='max-w-md absolute top-4 left-4 z-10 w-80'>
        {mapInstanceReady && (
          <SearchBox
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
          />
        )}
      </div>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onLoad={() => setMapInstanceReady(true)}
        mapboxAccessToken={environment.mapbox.accessToken}
        mapStyle='mapbox://styles/mapbox/streets-v11'
        style={{ width: '100%', height: '100%' }}
      >
         <GeolocateControl
          position="top-right"
          trackUserLocation={true}
          showUserLocation={true}

        />
        <NavigationControl position='bottom-right' />
      </Map>
    </div>
  )
}
