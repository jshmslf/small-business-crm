export const PERMISSIONS = {
    BUSINESS_MANAGE: "business.manage",
    TEAM_VIEW: "team.view",
    TEAM_INVITE: "team.invite",
    TEAM_REMOVE: "team.remove",
    TEAM_CREATE: "team.create",
    ROLES_MANAGE: "roles.manage",
    CUSTOMERS_VIEW: "customers.view",
    CUSTOMERS_CREATE: "customers.create",
    CUSTOMERS_EDIT: "customers.edit",
    CUSTOMERS_DELETE: "customers.delete"
} as const;

export const PERMISSION_LABELS: Record<Permission, string> = {
    "business.manage": "Manage business settings",
    "team.view": "View team members",
    "team.create": "Create staff accounts",
    "team.remove": "Remove team members",
    "team.invite": "Invite team members",
    "roles.manage": "Manage roles",
    "customers.view": "View customers",
    "customers.create": "Add customers",
    "customers.edit": "Edit customers",
    "customers.delete": "Delete customers",
}

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export const PERMISSION_GROUPS = [
    { label: "Business", permissions: [PERMISSIONS.BUSINESS_MANAGE] },
    {
        label: "Team",
        permissions: [PERMISSIONS.TEAM_VIEW, PERMISSIONS.TEAM_INVITE, PERMISSIONS.TEAM_REMOVE, PERMISSIONS.ROLES_MANAGE],
    },
    {
        label: "Customers",
        permissions: [
            PERMISSIONS.CUSTOMERS_CREATE,
            PERMISSIONS.CUSTOMERS_VIEW,
            PERMISSIONS.CUSTOMERS_EDIT,
            PERMISSIONS.CUSTOMERS_DELETE
        ],
    },
];