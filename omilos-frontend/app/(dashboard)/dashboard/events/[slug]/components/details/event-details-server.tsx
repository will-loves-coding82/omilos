"use server";
import { getEventDetails } from "@/app/actions/event-actions";
import EventDetailsClient from "./event-details-client";
import { toClientEvent } from "@/app/types/client-types";
import { notFound } from "next/navigation";
import { EventAbilityWrapper } from "@/app/providers/ability-provider";
import { dehydrate, HydrationBoundary, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QueryProvider } from "@/app/providers/query-provider";
import { eventKey } from "@/app/providers/query-keys";

export default async function EventDetailsServer({ slug }: { slug: string }) {
  const res = await getEventDetails(slug);

  if (res.message === "not_found") notFound();
  if (!res.success || !res.data.event) return <EventDetailsError />;

  const queryClient = new QueryClient();
  queryClient.setQueryData(eventKey(slug), toClientEvent(res.data.event));

  return (
    <QueryProvider>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <EventAbilityWrapper role={res.data.event.member_role}>
          <EventDetailsClient slug={slug}/>
        </EventAbilityWrapper>
      </HydrationBoundary>
    </QueryProvider>
  )
}

function EventDetailsError() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-2">
      <h2 className="text-lg font-medium text-text-primary">Couldn't load this event</h2>
      <p className="text-text-secondary text-sm">Something went wrong. Try refreshing the page.</p>
    </div>
  )
}