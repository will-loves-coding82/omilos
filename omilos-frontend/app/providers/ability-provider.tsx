"use client";

import { AbilityProvider, Can as CaslCan, CanProps} from '@casl/react';
import { AbilityBuilder, AbilityTuple, createMongoAbility, Ability } from '@casl/ability';
import { ActionVerb, MemberRole, ResourceSubject } from '../types/api-types';

type AppAbilities = AbilityTuple<ActionVerb, ResourceSubject>;
export type AppAbility = Ability<AppAbilities>; 

const rolePermissionsRecord: Record<MemberRole, [ActionVerb, ResourceSubject][]> = {
  host: [["manage", "all"]],
  editor: [
    ["read", "Event"],

    ["create", "Stop"],
    ["read", "Stop"],
    ["update", "Stop"],
    ["delete", "Stop"],
    ["update", "Role"],

    ["read", "StopStatus"],
    ["update", "StopStatus"],
  ],
  viewer: [
    ["read", "Event"],
    ["read", "Stop"],
    ["update", "StopStatus"],
  ]
};


function defineAbilitiesForEventMemberRole(role: MemberRole) {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  const rules = rolePermissionsRecord[role] || rolePermissionsRecord["viewer"];
  
  rules.forEach(([action, subject]) => {
    can(action, subject);
  });

  return build();
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

export const Can = CaslCan as React.ComponentType<CanProps<AppAbility>>;