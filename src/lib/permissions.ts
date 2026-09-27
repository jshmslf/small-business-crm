export const PERMISSIONS = {
    BUSINESS_MANAGE: "business.manage",
    TEAM_VIEW: "team.view",
    TEAM_INVITE: "team.invite",
    TEAM_REMOVE: "team.remove",
    ROLES_MANAGE: "roles.manage",
    CUSTOMERS_VIEW: "customers.view",
    CUSTOMERS_CREATE: "customers.create",
    CUSTOMERS_EDIT: "customers.edit",
    CUSTOMERS_DELETE: "customers.delete"
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export const PERMISSION_GROUPS = [
    { label: "Business", permission: [PERMISSIONS.BUSINESS_MANAGE] },
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