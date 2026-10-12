package app

import (
	"fmt"

	"github.com/casbin/casbin/v2"
	"github.com/casbin/casbin/v2/model"
)

type MemberRole = string

const (
	MemberRoleHost   MemberRole = "host"
	MemberRoleEditor MemberRole = "editor"
	MemberRoleViewer MemberRole = "viewer"
)

type ResourceSubject = string

const (
	ResourceSubjectAll        ResourceSubject = "all"
	ResourceSubjectEvent      ResourceSubject = "Event"
	ResourceSubjectStop       ResourceSubject = "Stop"
	ResourceSubjectStopStatus ResourceSubject = "StopStatus"
	ResourceSubjectMember     ResourceSubject = "Member"
	ResourceSubjectRole       ResourceSubject = "Role"
)

type ActionVerb string

const (
	ActionVerbManage ActionVerb = "manage" // Full CRUD access
	ActionVerbCreate ActionVerb = "create"
	ActionVerbRead   ActionVerb = "read"
	ActionVerbUpdate ActionVerb = "update"
	ActionVerbDelete ActionVerb = "delete"
)

type PolicyRule struct {
	Role    MemberRole
	Subject ResourceSubject
	Action  ActionVerb
}

var staticRolePolicies = []PolicyRule{
	// Host permissions
	{MemberRoleHost, ResourceSubjectAll, ActionVerbManage},

	// Editor permissions
	{MemberRoleEditor, ResourceSubjectEvent, ActionVerbRead},

	{MemberRoleEditor, ResourceSubjectStop, ActionVerbRead},
	{MemberRoleEditor, ResourceSubjectStop, ActionVerbCreate},
	{MemberRoleEditor, ResourceSubjectStop, ActionVerbUpdate},
	{MemberRoleEditor, ResourceSubjectStop, ActionVerbDelete},

	{MemberRoleEditor, ResourceSubjectStopStatus, ActionVerbRead},
	{MemberRoleEditor, ResourceSubjectStopStatus, ActionVerbUpdate},

	// Viewer permissions
	{MemberRoleViewer, ResourceSubjectEvent, ActionVerbRead},
	{MemberRoleViewer, ResourceSubjectStop, ActionVerbRead},
	{MemberRoleViewer, ResourceSubjectStopStatus, ActionVerbUpdate},
}

func getCasbinModel() model.Model {
	// If you pass the role "host" into this model, the matcher catches the
	// manage / all policy rule and bypasses resource restrictions completely.
	// For any other role, it strictly validates that the requested action
	// and resource explicitly match your backend array definitions.
	m := model.NewModel()
	m.AddDef("r", "r", "sub, obj, act")
	m.AddDef("p", "p", "sub, obj, act")
	m.AddDef("e", "e", "some(where (p.eft == allow))")
	m.AddDef("m", "m", `r.sub == p.sub && (p.act == "manage" && p.obj == "all" || r.obj == p.obj && r.act == p.act)`)
	return m
}

func InitializeEnforcer() (*casbin.Enforcer, error) {
	// Create an enforcer using the inline model configuration
	m := getCasbinModel()
	enforcer, err := casbin.NewEnforcer(m)
	if err != nil {
		return nil, err
	}

	// Dynamic loading from your Tygo-annotated matrix
	for _, rule := range staticRolePolicies {
		_, err := enforcer.AddPolicy(string(rule.Role), string(rule.Subject), string(rule.Action))
		if err != nil {
			return nil, fmt.Errorf("failed to load policy: %w", err)
		}
	}

	return enforcer, nil
}
