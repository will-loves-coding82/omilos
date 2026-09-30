"use client";

import Map, { NavigationControl, MapRef, GeolocateControl, Marker, Popup, Layer } from 'react-map-gl/mapbox';
import type { FillExtrusionLayerSpecification } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ReactEventHandler, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { environment } from './environments/environment';
import { Coordinates, ClientEventStop, ClientEvent, searchResultToClientEventStop, ClientStopStatus, ClientStopMemberStatus } from '@/app/types/client-types';


import EventStopSidePanel from './event-stop-side-panel';
import { addEventStop, reorderEventStops, setActiveEventStop, updateStopMemberStatus } from '@/app/actions/event-actions';
import { usePageActions } from '../../../components/context/header-actions-context';
import EventDetailsSidePanel from './event-details-side-panel';
import EventStopsMembersSidePanel from './event-stops-members-side-panel';
import {  UserAvatar, UserButton, useUser } from '@clerk/nextjs';
import { ChevronDown, Maximize2 } from 'lucide-react';

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

export default function EventDetailsClient({slug, event}: {slug: string, event: ClientEvent}) {
  const { user: clerkUser } = useUser();
  const mapRef = useRef<MapRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapInstanceReady, setMapInstanceReady] = useState(false);
  const [viewState, setViewState] = useState({ longitude: -74.5, latitude: 40, zoom: 12, pitch: 40});
  const [eventStops, setEventStops] = useState<ClientEventStop[]>(() => event.stops!!);
  const [activeStopId, setActiveStopId] = useState<number | undefined>(event.active_stop_id);

  const [selectedStop, setSelectedStop] = useState<ClientEventStop | null>(null); // Tracks the selected search result stop
  const [stopMarkerCoord, setStopMarkerCoord] = useState<Coordinates|null>(null);
  const [showStopMarkerPopup, setShowStopMarkerPopup] = useState(false); 
 
  const [openStopId, setOpenStopId] = useState<string | null>(null); // Tracks which existing stop the user selects
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [selectedEventStop, setSelectedEventStop] = useState<ClientEventStop | null>(null); // Tracks which existing stop is shown in the stop details panel
  const [isEventStopPanelOpen, setIsEventStopPanelOpen] = useState(false);

  const [isEventDetailsPanelOpen, setIsEventDetailsPanelOpen] = useState(false);

  // Track OS color scheme so the map style can switch with it
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);


  useEffect(() => {
    if (!mapInstanceReady) return;
    mapRef.current?.getMap().setConfigProperty(
      'basemap',
      'lightPreset',
      isDarkMode ? 'dusk' : 'day'
    );
  }, [isDarkMode, mapInstanceReady]);

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
        const res = await addEventStop(event.id, selectedStop)
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

  async function onToggleActiveStop(stopId: number, isActive: boolean) {
    const previousActiveStopId = activeStopId;
    const nextActiveStopId = isActive ? stopId : undefined;

    // Optimistically update before the request resolves
    setActiveStopId(nextActiveStopId);

    try {
      const res = await setActiveEventStop(event.id, nextActiveStopId ?? null);
      if (!res.success) {
        console.log("Failed to update active stop")
        setActiveStopId(previousActiveStopId);
      }
    }
    catch(err) {
      console.log("Error updating active stop: " + err)
      setActiveStopId(previousActiveStopId);
    }
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
      const res = await reorderEventStops(event.id, persistedStops);
      if (!res.success) {
        console.log("Failed to reorder event stops")
      }
    }
    catch(err) {
      console.log("Error reordering event stops")
    }
  }

  async function onUpdateUserStopStatus(stopId: number, status: ClientStopStatus) {
    const clerkId = clerkUser?.id;
    if (clerkId === undefined) {
      console.log("Could not resolve current user's clerk id")
      return;
    }

    const previousEventStops = eventStops;

    // Optimistically update before the request resolves. The DB user_id
    // isn't known/needed here — the server derives it from the verified
    // session — so this entry is matched and identified by clerk_id alone.
    setEventStops(prev => prev.map(stop => {
      if (stop.id !== stopId) return stop;

      const statusArr = stop.stop_member_status_arr ?? [];
      const existingIndex = statusArr.findIndex(s => s.clerk_id === clerkId);
      const updatedStatus: ClientStopMemberStatus = {
        user_id: existingIndex === -1 ? undefined : statusArr[existingIndex].user_id,
        clerk_id: clerkId,
        stop_id: stopId,
        stop_status: status,
        status_updated_at: new Date().toISOString(),
      };

      const nextStatusArr = existingIndex === -1
        ? [...statusArr, updatedStatus]
        : statusArr.map((s, i) => i === existingIndex ? updatedStatus : s);

      return { ...stop, stop_member_status_arr: nextStatusArr };
    }));

    try {
      const res = await updateStopMemberStatus(event.id, stopId, status);
      if (!res.success) {
        console.log("Failed to update stop status")
        setEventStops(previousEventStops);
      }
    }
    catch(err) {
      console.log("Error updating stop status: " + err)
      setEventStops(previousEventStops);
    }
  }

  function onDismissEventStopPanel() {
    setIsEventStopPanelOpen(prev => !prev)
  }

  function onDismissEventDetailsPanel() {
    setIsEventDetailsPanelOpen(prev => !prev)
  }

  // Renders custom header actions for this event
  usePageActions(
    <span className='flex items-center gap-4'>
      <UserButton/>
      <button onClick={() => setIsEventDetailsPanelOpen(true)} className='bg-button-primary hover:cursor-pointer border-1 border-border-transparent text-white text-sm rounded-lg px-5 py-1'>Info</button>
    </span>
  )

  return (
    <div ref={containerRef} className='absolute inset-0 z-0 w-full h-full'>      
      {/* Left panel that shows all the stops and participants */}
      <EventStopsMembersSidePanel participants={event.members} eventStops={eventStops} onReorderStops={onReorderEventStops} onSelectStop={selectEventStop} activeStopId={openStopId} activeEventStopId={activeStopId} />

      {/* Dismissable right panel that shows the event details */}
      <EventDetailsSidePanel event={event} isOpen={isEventDetailsPanelOpen} onDismiss={onDismissEventDetailsPanel}/>

      {/* Dismissable right panel that shows a selected event details */}
      {selectedEventStop && (() => {
        // Look up the live version from eventStops rather than the frozen
        // snapshot taken when the stop was selected, so status updates made
        // elsewhere (e.g. the map popup) are reflected here too.
        const currentSelectedStop = eventStops.find(s => s.mapbox_id === selectedEventStop.mapbox_id) ?? selectedEventStop;

        return (
          <EventStopSidePanel
            stop={currentSelectedStop}
            members={event.members}
            isOpen={isEventStopPanelOpen}
            onDeleteStop={onDeleteStop}
            onDismiss={onDismissEventStopPanel}
            isActive={currentSelectedStop.id !== undefined && currentSelectedStop.id === activeStopId}
            onToggleActive={(isActive) => currentSelectedStop.id !== undefined && onToggleActiveStop(currentSelectedStop.id, isActive)}
          />
        );
      })()}


      {/* Map overlays elements that need to respond to sidebar and panel resizing  */}
      <div className='max-w-md absolute top-4 z-10 w-full md:left-[calc(var(--panel-width)+1rem)] md:translate-x-0 md:w-88 transition-[left] duration-300'>
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
              setSelectedStop(searchResultToClientEventStop(res));
            }}
          />
        )}
      </div>
      {/* Fixed to the viewport so the map itself never shifts or resizes when
          the dashboard sidebar or these overlay panels expand/collapse. */}
      <div className='fixed z-0 top-[var(--header-height)] right-0 bottom-0 left-0'>
      <Map
        ref={mapRef}
        {...viewState}
        projection={"globe"}
        onMove={evt => setViewState(evt.viewState)}
        onLoad={() => setMapInstanceReady(true)}
        mapboxAccessToken={environment.mapbox.accessToken}
        mapStyle={'mapbox://styles/mapbox/standard'}
        style={{ width: '100%', height: '100%' }}
      >
         <GeolocateControl
          position="bottom-right"
          trackUserLocation={true}
          showUserLocation={true}
        />
        <Layer {...buildingExtrusionLayer} />
        { stopMarkerCoord && (
          <>
            { showStopMarkerPopup && (
              <Popup
                className='event-popup flex'
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
                  <button onClick={onAddEventStop} className='bg-button-primary text-text-primary p-2 text-lg rounded-md hover:cursor-pointer'>Add Stop</button>
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
                  className='event-popup flex'
                  anchor='bottom'
                  onClose={() => {
                    setOpenStopId(null);
                    setIsEventStopPanelOpen(false);
                  }}
                  longitude={s.longitude}
                  latitude={s.latitude}
                >
                  <div className='flex flex-col gap-8 justify-between'>
                    <div className='flex justify-between gap-2 pr-9 w-full'>
                       <header className='flex flex-col gap-1'>
                        <h3 className='text-xl font-medium text-text-primary'>{s.name}</h3>
                        <p className='text-lg text-text-secondary'>{s.address}</p>
                      </header>
                      <button
                        onClick={() => { setSelectedEventStop(s); setIsEventStopPanelOpen(true); }}
                        className='self-start hover:cursor-pointer bg-button-secondary hover:bg-button-tertiary rounded-lg p-2 transition-colors'
                        aria-label='View stop details'
                      >
                        <Maximize2 size={16} className='text-text-secondary'/>
                      </button>
                    </div>


                    {(() => {
                      const total = event.members.filter(m => m.rsvp_status === "accepted").length;
                      const arrivedCount = s.stop_member_status_arr?.filter(m => m.stop_status === 'arrived').length ?? 0;
                      return (
                        <div className='flex flex-col justify-center gap-1.5 p-3 rounded-lg min-h-24 bg-bg-secondary'>
                          <div className='flex justify-end gap-1.5'>
                            <span className='text-lg font-medium text-text-primary'>{arrivedCount}/{total}</span>
                            <span className='text-lg text-text-secondary'>Arrived</span>
                          </div>
                          <div className='w-full h-2 bg-bg-tertiary rounded-full overflow-hidden'>
                            <div
                              className='h-full bg-bg-info rounded-full transition-all duration-300'
                              style={{ width: total > 0 ? `${(arrivedCount / total) * 100}%` : '0%' }}
                            />
                          </div>
                        </div>
                      );
                    })()}

                    <div className='flex items-center w-fit gap-2' >
                      <UserAvatar/>
                      <div className='relative'>
                        <select
                          value={s.stop_member_status_arr?.find(m => m.clerk_id === clerkUser?.id)?.stop_status ?? "not_started"}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                            if (s.id === undefined) return;
                            onUpdateUserStopStatus(s.id, e.target.value as ClientStopStatus);
                          }}
                          className='appearance-none bg-bg-secondary w-36 py-2 pl-4 pr-9 rounded-md text-text-primary text-md'
                        >
                          <option value="not_started">Not started</option>
                          <option value="in_progress">In Progress</option>
                          <option value="arrived">Arrived</option>
                          <option value="no_show">No Show</option>
                        </select>
                        <ChevronDown size={16} className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary'/>
                      </div>
                    </div>

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
    </div>
  )
}
