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
    CUSTOMERS_DELETE: "customers.delete",
    INVENTORY_VIEW: "inventory.view",
    INVENTORY_VIEW_COST: "inventory.viewCost",
    INVENTORY_CREATE: "inventory.create",
    INVENTORY_EDIT: "inventory.edit",
    INVENTORY_DELETE: "inventory.delete",
    ORDERS_VIEW: "orders.view",
    ORDERS_CREATE: "orders.create",
    ORDERS_MANAGE: "orders.manage",
    ORDERS_CANCEL: "orders.cancel",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

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
    "inventory.view": "View Inventory",
    "inventory.viewCost": "See buying prices and profit",
    "inventory.create": "Add items and sellers",
    "inventory.edit": "Edit items and sellers",
    "inventory.delete": "Delete items and sellers",
    "orders.view": "View orders",
    "orders.create": "Create orders",
    "orders.manage": "Update orders and record payments",
    "orders.cancel": "Cancel orders",
}

type PermissionGroup = { label: string; permissions: Permission[] };

export const PERMISSION_GROUPS: PermissionGroup[] = [
    { label: "Business", permissions: [PERMISSIONS.BUSINESS_MANAGE] },
    {
        label: "Team",
        permissions: [
            PERMISSIONS.TEAM_VIEW,
            PERMISSIONS.TEAM_INVITE,
            PERMISSIONS.TEAM_REMOVE,
            PERMISSIONS.ROLES_MANAGE],
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
    {
        label: "Inventory",
        permissions: [
            PERMISSIONS.INVENTORY_CREATE,
            PERMISSIONS.INVENTORY_DELETE,
            PERMISSIONS.INVENTORY_EDIT,
            PERMISSIONS.INVENTORY_VIEW,
            PERMISSIONS.INVENTORY_VIEW_COST,
        ]
    },
    {
        label: "Orders",
        permissions: [
            PERMISSIONS.ORDERS_VIEW,
            PERMISSIONS.ORDERS_CREATE,
            PERMISSIONS.ORDERS_MANAGE,
            PERMISSIONS.ORDERS_CANCEL,
        ]
    }
];