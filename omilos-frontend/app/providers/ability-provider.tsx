"use client";

import { AbilityProvider } from '@casl/react';
import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import { MemberRole } from '../types/api-types';


function defineAbilitiesForEventMemberRole(role: MemberRole) {
  const { can, build } = new AbilityBuilder(createMongoAbility);

  switch(role) {
    case "host":
      can('manage', 'all');
      return build();
    case "editor":
      can('read', 'Event');
      can('add', 'Stop');
      can('delete', 'Stop');
      can('update', 'Stop');
      can('update', 'Role');
      return build();
    default:
      can('read', 'Event')
      return build();
  }
}

export function EventAbilityWrapper({ 
  children, 
  role
}: { 
  children: React.ReactNode; 
  role: MemberRole
}) {
  // Generates a stable, reactive ability module instance pinned to this specific event layout
  const ability = defineAbilitiesForEventMemberRole(role);

  return (
    <AbilityProvider value={ability}>
      {children}
    </AbilityProvider>
  );
}