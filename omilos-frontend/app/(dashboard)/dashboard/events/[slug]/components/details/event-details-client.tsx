"use client";

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { environment } from '../../environment';
import Image from "next/image";

import { StopMemberStatus, StopStatus } from '@/app/types/api-types';
import { Coordinates, ClientEventStop, ClientEvent, searchResultToClientEventStop, ClientStopMemberStatus, toClientEvent, toClientEventMember, toClientEventStop, ClientEventMember } from '@/app/types/client-types';

import { usePageActions } from '../../../../components/context/header-actions-context';
import { addEventStop, getEventDetails, getEventMembers, getEventStops, reorderEventStops, setActiveEventStop, updateStopMemberStatus } from '@/app/actions/event-actions';

import EventStopSidePanel from '../side-panels/stop-details-side-panel-client';
import EventDetailsSidePanel from '../side-panels/info-side-panel-client';
import EventManagementSidePanel from '../side-panels/management-side-panel-client';

import Map, { NavigationControl, MapRef, GeolocateControl, Marker, Popup, Layer } from 'react-map-gl/mapbox';
import type { FillExtrusionLayerSpecification } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Point } from 'geojson';

import { UserAvatar, UserButton, useUser } from '@clerk/nextjs';
import { ChevronDown, CircleCheck, Maximize2, Minimize2, PanelRightClose, PanelRightOpen, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eventKey, membersKey, stopsKey, userStopStatusMutationKey } from '@/app/providers/query-keys';
import { AnimatePresence, motion } from 'motion/react';
import { Can } from '@/app/providers/ability-provider';


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


export default function EventDetailsClient({ slug }: { slug: string }) {
  const { data: event, isPending, isError } = useQuery({
    queryKey: eventKey(slug),
    queryFn: async (): Promise<ClientEvent> => {
      const res = await getEventDetails(slug);
      if (!res.success || !res.data.event) {
        throw new Error(res.message ?? "Failed to load event");
      }
      return toClientEvent(res.data.event);
    },
  });

  if (isPending) return <p>loading...</p>;   // only hit if hydration missed
  if (isError || !event) return <p>Event not found</p>;

  return <EventDetails event={event} slug={slug} />;
}


function EventDetails({ event, slug }: { event: ClientEvent, slug: string }) {

  const mapRef = useRef<MapRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapInstanceReady, setMapInstanceReady] = useState(false);
  const [viewState, setViewState] = useState({ longitude: -74.5, latitude: 40, zoom: 12, pitch: 40 });

  const [selectedStop, setSelectedStop] = useState<ClientEventStop | null>(null); // Tracks the selected search result stop
  const [stopMarkerCoord, setStopMarkerCoord] = useState<Coordinates | null>(null);
  const [showStopMarkerPopup, setShowStopMarkerPopup] = useState(false);

  const [openStopId, setOpenStopId] = useState<string | null>(null); // Tracks which existing stop the user selects
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [selectedEventStop, setSelectedEventStop] = useState<ClientEventStop | null>(null); // Tracks which existing stop is shown in the stop details panel
  const [isEventStopPanelOpen, setIsEventStopPanelOpen] = useState(false);
  const [isEventDetailsPanelOpen, setIsEventDetailsPanelOpen] = useState(false);
  const [isDeleteStopModalOpen, setIsDeleteStopModalOpen] = useState(false);


  const { user: clerkUser } = useUser();

  // Tanstack Query functions
  const queryClient = useQueryClient();
  const eventId = event.id;

  const { data: stopsData } = useQuery({
    queryKey: stopsKey(eventId),
    queryFn: async (): Promise<ClientEventStop[]> => {
      const res = await getEventStops(eventId);
      if (!res.success) throw new Error(res.message ?? "Failed to load stops");
      return res.data.stops.map(toClientEventStop);
    }
  });

  const { data: membersData } = useQuery({
    queryKey: membersKey(eventId),
    queryFn: async (): Promise<ClientEventMember[]> => {
      const res = await getEventMembers(eventId);
      if (!res.success) throw new Error(res.message ?? "Failed to load members");
      return res.data.members.map(toClientEventMember);
    },
  });

  const setActiveStop = useMutation({
    mutationKey: eventKey(slug),
    mutationFn: async (nextStopId: number | null) => {
      const res = await setActiveEventStop(event.id, nextStopId);
      if (!res.success) throw new Error(res.message ?? "Failed to update active stop");
      return nextStopId;
    },
    onMutate: async (nextStopId) => {
      await queryClient.cancelQueries({ queryKey: eventKey(slug) });
      const previous = queryClient.getQueryData<ClientEvent>(eventKey(slug));
      queryClient.setQueryData<ClientEvent>(eventKey(slug), (old) =>
        old ? { ...old, active_stop_id: nextStopId } : old,
      );
      return { previous };
    },
    onError: (_e, _n, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(eventKey(slug), ctx.previous);
      console.error("Couldn't update the active stop");
    }
  });

  function onToggleActiveStop(stopId: number, isActive: boolean) {
    setActiveStop.mutate(isActive ? stopId : null);
  }

  const setUserStopStatus = useMutation({
    mutationKey: userStopStatusMutationKey(eventId),
    mutationFn: async ({ stopId, status }: { stopId: number; status: StopStatus }) => {
      const res = await updateStopMemberStatus(eventId, stopId, status);
      if (!res.success) throw new Error(res.message ?? "Failed to update stop status");
    },
    onMutate: async ({ stopId, status }) => {
      const clerkId = clerkUser?.id;
      await queryClient.cancelQueries({ queryKey: stopsKey(eventId) });
      const previous = queryClient.getQueryData<ClientEventStop[]>(stopsKey(eventId));

      queryClient.setQueryData<ClientEventStop[]>(stopsKey(eventId), (old) =>
        old?.map((s) => {
          if (s.id !== stopId) return s;
          const arr = s.stop_member_status_arr ?? [];
          const exists = arr.some((m) => m.clerk_id === clerkId);
          return {
            ...s,
            stop_member_status_arr: exists
              ? arr.map((m) =>
                m.clerk_id === clerkId
                  ? { ...m, stop_status: status, status_updated_at: new Date().toISOString() }
                  : m,
              )
              : [
                ...arr,
                {
                  clerk_id: clerkId!,
                  stop_id: stopId,
                  stop_status: status,
                  status_updated_at: new Date().toISOString(),
                } as StopMemberStatus, // adjust to your type (user_id isn't known client-side)
              ],
          };
        }),
      );
      return { previous };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(stopsKey(eventId), ctx.previous);
      console.error("Couldn't update your status");
    }
  });

  function onUpdateUserStopStatus(stopId: number, status: StopStatus) {
    if (!clerkUser?.id) return;
    setUserStopStatus.mutate({ stopId, status });
  }

  const createEventStop = useMutation({
    mutationKey: ["event", eventId, "create-stop"] as const,
    mutationFn: async (stop: ClientEventStop): Promise<ClientEventStop> => {
      const res = await addEventStop(eventId, stop);
      if (!res.success || !res.data) throw new Error(res.message ?? "Failed to add stop");
      return toClientEventStop(res.data.newStop);
    },
    onSuccess: (saved, _) => {
      queryClient.setQueryData<ClientEventStop[]>(stopsKey(eventId), (old) => [
        ...(old ?? []),
        { ...saved, stop_member_status_arr: [] },
      ]);
    },
  });

  async function onAddEventStop() {
    if (!clerkUser?.id) return;
    if (!selectedStop) return;
    createEventStop.mutate(selectedStop);
  }

  const eventStops = stopsData ?? [];
  const eventMembers = membersData ?? [];
  const activeStopId = event.active_stop_id ?? null;

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
      // console.log(selectedStop)
      setStopMarkerCoord({ lon: selectedStop.longitude, lat: selectedStop.latitude })
    }
  }, [selectedStop])

  // TODO: Use reverse geocoding to get poi details
  useEffect(() => {
  const map = mapRef.current?.getMap();
  if (!map || !mapInstanceReady) return;

  map.addInteraction('poi-click', {
    type: 'click',
    target: { featuresetId: 'poi', importId: 'basemap' },
    handler: (e) => {
      const feature = e.feature;
      if (!feature) return;

      // POIs are points, so geometry.coordinates is [lng, lat]
      const [lon, lat] = (feature.geometry as Point).coordinates;
      const { name, address } = feature.properties;
      console.log(`Clicked ${address} at: ${lon}, ${lat}`);

      // setStopMarkerCoord({ lon: lon, lat: lat});
      // setSelectedStop({ name: name, address: address, mapbox_id: feature.id, lon: lon, lat: lat } as any);
    },
  });

  return () => {
    map.removeInteraction('poi-click');
  };
}, [mapInstanceReady]);


  async function onReorderEventStops(stops: ClientEventStop[]) {
    const orderUnchanged = stops.length === eventStops.length
      && stops.every((s, i) => s.mapbox_id === eventStops[i].mapbox_id);
    if (orderUnchanged) {
      return;
    }

    // Stops not yet persisted (no id) can't be reordered on the backend yet
    const persistedStops = stops.filter((s): s is ClientEventStop & { id: number } => s.id !== undefined);

    try {
      const res = await reorderEventStops(event.id, persistedStops);
      if (!res.success) {
        console.log("Failed to reorder event stops")
      }
    }
    catch (err) {
      console.log("Error reordering event stops")
    }
  }

   function selectEventStop(stop: ClientEventStop) {
    setOpenStopId(stop.mapbox_id);
    setSelectedEventStop(stop);
    mapRef.current?.getMap().flyTo({
      center: [stop.longitude, stop.latitude],
      zoom: 15,
    });
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
      <UserButton />
      <button onClick={() => setIsEventDetailsPanelOpen(true)} className='bg-button-primary hover:cursor-pointer border-1 border-border-transparent text-white text-sm rounded-lg px-5 py-1'>Info</button>
    </span>
  )

  return (
    <div ref={containerRef} className='absolute inset-0 z-0 w-full h-full'>

       <AnimatePresence>
        {isDeleteStopModalOpen &&
          <>
            {/* Darkens the background and allows the user to dismiss the modal by clicking outside it */}
            <motion.div
              className="fixed inset-0 bg-black/40 z-50"
              onClick={() => setIsDeleteStopModalOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            />

              <motion.div
                className="fixed top-1/2 left-1/2 z-50 h-[240px] w-[400px] bg-bg-secondary border-1 border-border-primary rounded-xl shadow-md overflow-hidden p-4"
                initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
                animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
                exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
                transition={{ duration: 0.15 }}
              >
                <section className="flex w-full justify-between">
                  <span className="flex flex-col">
                    <h2 className="text-xl font-medium">Delete Stop {selectedEventStop?.name}?</h2>
                    <p className="text-text-secondary text-sm">This action cannot be undone</p>
                  </span>
                  <button onClick={()=>setIsDeleteStopModalOpen(false)} className="hover:cursor-pointer bg-bg-secondary rounded-sm p-1 w-fit h-fit"><X size={16}/></button>
                </section>
            </motion.div>
          </>
        }
      </AnimatePresence>

      
      {/* Left panel that manages all the stops and participants */}
      <EventManagementSidePanel eventId={event.id} eventStops={eventStops} members={eventMembers} onReorderStops={onReorderEventStops} onSelectStop={selectEventStop} activeStopId={openStopId} activeEventStopId={activeStopId} />

      {/* Dismissable right panel that shows the event details */}
      <EventDetailsSidePanel event={event} members={eventMembers} isOpen={isEventDetailsPanelOpen} onDismiss={onDismissEventDetailsPanel} />

      {/* Dismissable right panel that shows a selected event details */}
      {selectedEventStop && (() => {
        // Look up the live version from eventStops rather than the frozen
        // snapshot taken when the stop was selected, so status updates made
        // elsewhere (e.g. the map popup) are reflected here too.
        const currentSelectedStop = eventStops.find(s => s.mapbox_id === selectedEventStop.mapbox_id) ?? selectedEventStop;

        return (
          <EventStopSidePanel
            stop={currentSelectedStop}
            members={eventMembers}
            isOpen={isEventStopPanelOpen}
            onDeleteStop={() => setIsDeleteStopModalOpen(true)} 
            onDismiss={onDismissEventStopPanel}
            isActive={currentSelectedStop.id !== undefined && currentSelectedStop.id === activeStopId}
            onToggleActive={(isActive) => currentSelectedStop.id !== undefined && onToggleActiveStop(currentSelectedStop.id, isActive)}
          />
        );
      })()}


      {/* Map overlays elements that need to respond to sidebar and panel resizing  */}
      <Can I="create" a="Stop">
        <div className='max-w-md absolute top-4 z-10 w-full md:left-[calc(var(--panel-width)+1rem)] md:translate-x-0 md:w-88 transition-[left] duration-300'>
          {mapInstanceReady && (
            <SearchBox
              placeholder='Add a stop'
              onChange={(s) => {
                if (s.length === 0) {
                  setStopMarkerCoord(null);
                  setShowStopMarkerPopup(false);
                }
              }}
              onClear={() => {
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
      </Can>
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

          {stopMarkerCoord && (
            <>
              {showStopMarkerPopup && (
                <Popup
                  className='event-popup flex'
                  anchor='bottom'
                  onClose={() => setShowStopMarkerPopup(false)}
                  longitude={stopMarkerCoord.lon!}
                  latitude={stopMarkerCoord.lat!}
                >
                  <div className='flex flex-col justify-between h-[140px]'>
                    <header className='flex flex-col gap-2'>
                      <h3 className='text-xl font-semibold text-text-primary'>{selectedStop?.name}</h3>
                      <p className='text-lg text-text-secondary'>{selectedStop?.address}</p>
                    </header>
                    <button onClick={onAddEventStop} className='mt-full bg-button-primary text-white p-2 text-lg rounded-md hover:cursor-pointer'>Add Stop</button>
                  </div>
                </Popup>
              )}

              <Marker onClick={(e) => {
                e.originalEvent.stopPropagation();
                setShowStopMarkerPopup(true);
              }} color="#0662db" longitude={stopMarkerCoord.lon!} latitude={stopMarkerCoord.lat!} />
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
                    <div className='flex flex-col gap-4 justify-between'>

                      <header className='flex justify-between gap-2 pr-9 w-full'>
                        <h3 className='text-xl font-semibold text-text-primary'>Stop Details</h3>
                        {
                          activeStopId!! && activeStopId === s.id &&
                          <span className="w-fit flex items-center gap-1 bg-bg-active text-text-active text-xs font-medium rounded-lg px-2 py-1">
                            <CircleCheck size={12} strokeWidth={3} />
                            Active
                          </span>
                        }
                      </header>

                      <hr className='border-border-primary mx-[-1rem]' />

                      <section className='flex flex-col gap-4'>
                        <span className='flex flex-col'>
                          <p className='text-text-primary text-lg'>{s.name}</p>
                          <p className='text-text-secondary text-md'>{s.address}</p>
                        </span>

                        <div className='flex justify-between items-center w-full' >
                          <div className='relative'>
                            <select
                              value={s.stop_member_status_arr?.find(m => m.clerk_id === clerkUser?.id)?.stop_status ?? "not_started"}
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                if (s.id === undefined) return;
                                onUpdateUserStopStatus(s.id, e.target.value as StopStatus);
                              }}
                              className='appearance-none bg-bg-secondary w-36 py-2 pl-4 pr-9 rounded-lg text-text-primary text-md'
                            >
                              <option value="not_started">Not started</option>
                              <option value="in_progress">In Progress</option>
                              <option value="arrived">Arrived</option>
                              <option value="no_show">No Show</option>
                            </select>
                            <ChevronDown size={16} className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary' />
                          </div>

                          <button
                            onClick={() => { setSelectedEventStop(s); setIsEventStopPanelOpen(prev => !prev); }}
                            className='self-start hover:cursor-pointer bg-button-secondary hover:bg-button-tertiary rounded-lg p-2.5 transition-colors'
                            aria-label='View stop details'
                          >
                            {
                              isEventStopPanelOpen ?
                              <Minimize2 size={16} strokeWidth={2.5} className='text-text-secondary'/>
                              :
                              <Maximize2 size={16} strokeWidth={2.5} className='text-text-secondary' />
                            }
                          </button>
                        </div>

                        {(() => {
                          const total = eventMembers.filter(m => m.rsvp_status === "accepted").length;
                          const arrivedCount = s.stop_member_status_arr?.filter(m => m.stop_status === 'arrived').length ?? 0;
                          const arrivedMemberIds = s.stop_member_status_arr?.filter(m => m.stop_status === 'arrived').map(m => m.clerk_id)
                          const arrivedMemberProfiles = eventMembers.filter(m => arrivedMemberIds?.includes(m.user.clerk_id))
                          const limit = 2
                          return (
                            <div className='flex flex-col justify-center gap-1.5 p-3 rounded-lg min-h-24 bg-bg-secondary'>
                              <div className='flex justify-between gap-1.5'>

                                <span className='flex items-center'>
                                  <ul id="arrived-members" className='flex max-w-30'>
                                    {
                                      arrivedMemberProfiles.slice(0, limit).map((member, index)=> (
                                        <Image  
                                        key={member.user.clerk_id}
                                        width={32}
                                        height={32}
                                        className={`rounded-full border-2 border-border-primary ${index > 0 && "translate-x-[-10px]"}`}
                                        alt="user profile"
                                        src={member.user.image_url!}
                                        />
                                      ))
                                    }
                                  </ul>

                                  {
                                    arrivedMemberProfiles.length > limit && (
                                      <div className='w-[32px] h-[32px] p-2 flex items-center justify-center bg-bg-tertiary border-2 border-border-primary rounded-full translate-x-[-10px]'>
                                        <p className='text-md text-text-secondary'>+{arrivedMemberProfiles.length  - limit}</p>
                                      </div>
                                    )
                                  }
                                </span>
                                <span className='flex gap-2'>
                                  <p className='text-lg font-medium text-text-primary'>{arrivedCount}/{total}</p>
                                  <p className='text-lg text-text-secondary'>Arrived</p>
                                </span>
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

                      </section>
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
