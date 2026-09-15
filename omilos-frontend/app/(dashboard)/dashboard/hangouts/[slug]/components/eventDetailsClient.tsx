"use client";

import Map, { NavigationControl, MapRef, GeolocateControl, Marker, Popup, Layer } from 'react-map-gl/mapbox';
import type { FillExtrusionLayerSpecification } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css'; // Don't forget the CSS!
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { SearchBoxRetrieveResponse } from '@mapbox/search-js-core';
import { environment } from './environments/environment';
import EventSidePanel from './eventSidePanel';
import { Coordinates, ClientEventStop } from '@/app/types/client';
import { APIEventStop } from '@/app/types/api';
import { addEventStop, reorderEventStops } from '../../actions';
import EventStopSidePanel from './eventStopSidePanel';

function toClientEventStop(stop: APIEventStop): ClientEventStop {
  return {
    id: stop.id,
    address: stop.address,
    name: stop.name,
    mapbox_id: String(stop.id),
    latitude: stop.latitude,
    longitude: stop.longitude,
    stop_member_status_arr: stop.stop_member_status_arr
  }
}


function toEventStop(res: SearchBoxRetrieveResponse): ClientEventStop {
  return {
    address: res.features[0].properties.address ?? '',
    name: res.features[0].properties.name ?? '',
    mapbox_id: res.features[0].properties.name ?? '',
    latitude: res.features[0].properties.coordinates.latitude,
    longitude: res.features[0].properties.coordinates.longitude,
    stop_member_status_arr: [],
  }
}

const SearchBox = dynamic(
  () => import("@mapbox/search-js-react").then((mod) => mod.SearchBox),
  { ssr: false }
);

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

export default function EventDetailsClient({slug, initialStops}: {slug: string, initialStops: APIEventStop[]}) {
  const mapRef = useRef<MapRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapInstanceReady, setMapInstanceReady] = useState(false);
  const [viewState, setViewState] = useState({ longitude: -74.5, latitude: 40, zoom: 12, pitch: 40});

  const [eventStops, setEventStops] = useState<ClientEventStop[]>(() => initialStops.map(toClientEventStop));
  
  const [selectedStop, setSelectedStop] = useState<ClientEventStop | null>(null); // Tracks the selected search result stop
  const [stopMarkerCoord, setStopMarkerCoord] = useState<Coordinates|null>(null);
  const [showStopMarkerPopup, setShowStopMarkerPopup] = useState(false); 
 
  const [openStopId, setOpenStopId] = useState<string | null>(null); // Tracks which existing stop the user selects
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [selectedEventStop, setSelectedEventStop] = useState<ClientEventStop | null>(null); // Tracks which existing stop is shown in the stop details panel
  const [isEventStopPanelOpen, setIsEventStopPanelOpen] = useState(false);

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


  // Update the active marker when user selects on a stop or search result
  useEffect(() => {
    if (selectedStop) {
      console.log(selectedStop)
      setStopMarkerCoord({lon: selectedStop.longitude, lat: selectedStop.latitude})
    }
  }, [selectedStop])


  function selectEventStop(stop: ClientEventStop) {
    setOpenStopId(stop.mapbox_id);
    setSelectedEventStop(stop);
    mapRef.current?.getMap().flyTo({
      center: [stop.longitude, stop.latitude],
      zoom: 15,
    });
  }

  async function onAddEventStop() {
    if (selectedStop) {
      if (eventStops.includes(selectedStop)) {
        return
      }
      setShowStopMarkerPopup(false);
      setSelectedStop(null);
      setEventStops(prev => [...prev, selectedStop])

      // Sync with database
      try {
        const res = await addEventStop(slug, selectedStop)
        if (!res.success || !res.data) {
          console.log("Failed to add stop to database")
        } else {
          const stopId = res.data.id;
          setEventStops(prev => prev.map(s => s.mapbox_id === selectedStop.mapbox_id ? { ...s, id: stopId } : s))
        }
      }
      catch(err) {
        console.log("Error adding stop to database: " + err)
      }
    }
  }

  async function onDeleteStop() {

  }

  async function onReorderEventStops(stops: ClientEventStop[]) {
    const orderUnchanged = stops.length === eventStops.length
      && stops.every((s, i) => s.mapbox_id === eventStops[i].mapbox_id);
    if (orderUnchanged) {
      return;
    }

    setEventStops(stops);
    // Stops not yet persisted (no id) can't be reordered on the backend yet
    const persistedStops = stops.filter((s): s is ClientEventStop & { id: number } => s.id !== undefined);

    try {
      const res = await reorderEventStops(slug, persistedStops);
      if (!res.success) {
        console.log("Failed to reorder event stops")
      }
    }
    catch(err) {
      console.log("Error reordering event stops")
    }
  }


  function onDismissEventStopPanel() {
    setIsEventStopPanelOpen(prev => !prev)
  }

  return (
    <div ref={containerRef} className='fixed inset-0 z-0'>
      <EventSidePanel eventStops={eventStops} onReorderStops={onReorderEventStops} onSelectStop={selectEventStop} activeStopId={openStopId} />
      {selectedEventStop && (
        <EventStopSidePanel stop={selectedEventStop} isOpen={isEventStopPanelOpen} onDeleteStop={onDeleteStop} onDismiss={onDismissEventStopPanel}/>
      )}
      {/* Map overlays elements that need to respond to sidebar and panel resizing  */}
      <div className='max-w-md absolute top-4 z-10 w-[calc(100%-5rem)] left-1/2 -translate-x-1/2 md:left-[calc(var(--sidebar-width)+var(--panel-width)+1rem)] md:translate-x-0 md:w-80 transition-[left] duration-300'>
        {mapInstanceReady && (
          <SearchBox
          placeholder='Add a stop'
          onChange={(s)=>{
            if (s.length === 0) {
              setStopMarkerCoord(null);
                setShowStopMarkerPopup(false);
              }
            }}
            onClear={()=> {
                setStopMarkerCoord(null);
                setShowStopMarkerPopup(false);
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
              console.log(res)
              setSelectedStop(toEventStop(res));
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
        { stopMarkerCoord && (
          <>
            { showStopMarkerPopup && (
              <Popup
                className='hangout-popup flex'
                anchor='bottom'
                onClose={()=> setShowStopMarkerPopup(false)}
                longitude={stopMarkerCoord.lon!}
                latitude={stopMarkerCoord.lat!}
              >
                <div className='flex flex-col justify-between h-[164px]'>
                  <header className='flex flex-col gap-2'>
                    <h3 className='text-xl font-semibold text-text-primary'>{selectedStop?.name}</h3>
                    <p className='text-lg text-text-secondary'>{selectedStop?.address}</p>
                  </header>
                  <button onClick={onAddEventStop} className='bg-black text-white p-2 text-lg rounded-md hover:cursor-pointer'>Add Stop</button>
                </div>

              </Popup>
            )}
            <Marker onClick={(e) => {
              e.originalEvent.stopPropagation();
              setShowStopMarkerPopup(true);
            }} color="#0662db" longitude={stopMarkerCoord.lon!} latitude={stopMarkerCoord.lat!}/>
          </>
        )}

        {
          eventStops.map((s) => (
            <div key={s.mapbox_id}>
              {openStopId === s.mapbox_id && (
                <Popup
                  className='hangout-popup flex'
                  anchor='bottom'
                  onClose={() => {
                    setOpenStopId(null);
                    setIsEventStopPanelOpen(false);
                  }}
                  longitude={s.longitude}
                  latitude={s.latitude}
                >
                  <div className='flex flex-col justify-between h-[164px]'>
                    <header className='flex flex-col gap-2'>
                      <h3 className='text-xl font-semibold text-text-primary'>{s.name}</h3>
                      <p className='text-lg text-text-secondary'>{s.address}</p>
                    </header>
                    <button onClick={()=> { setSelectedEventStop(s); setIsEventStopPanelOpen(true); }} className='bg-black text-white p-2 text-lg rounded-md hover:cursor-pointer'>View</button>
                  </div>
                </Popup>
              )}
              <Marker
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  setOpenStopId(s.mapbox_id);
                }}
                color="#0662db"
                longitude={s.longitude}
                latitude={s.latitude}
              />
            </div>
          ))
        }
        <NavigationControl position='bottom-right' />
      </Map>
    </div>
  )
}
