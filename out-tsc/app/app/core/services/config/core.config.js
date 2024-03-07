export const APP_CORE_CONFIG_OPTIONS = Object.freeze({
    UPDATE_TECHNICAL_TABLES: {
        key: 'sumaris.persistence.technicalTables.update',
        label: 'CONFIGURATION.OPTIONS.UPDATE_TECHNICAL_TABLES',
        type: 'boolean',
        defaultValue: false
    },
    GEOMETRY_SRID: {
        key: 'sumaris.geometry.srid',
        label: 'CONFIGURATION.OPTIONS.GEOMETRY_SRID',
        type: 'integer',
        defaultValue: 0
    },
    // Enumerations
    PROFILE_ADMIN_LABEL: {
        key: 'sumaris.enumeration.UserProfile.ADMIN.label',
        label: 'CONFIGURATION.OPTIONS.PROFILE.ADMIN',
        type: 'string',
        defaultValue: 'ADMIN'
    },
    PROFILE_USER_LABEL: {
        key: 'sumaris.enumeration.UserProfile.USER.label',
        label: 'CONFIGURATION.OPTIONS.PROFILE.USER',
        type: 'string',
        defaultValue: 'USER'
    },
    PROFILE_SUPERVISOR_LABEL: {
        key: 'sumaris.enumeration.UserProfile.SUPERVISOR.label',
        label: 'CONFIGURATION.OPTIONS.PROFILE.SUPERVISOR',
        type: 'string',
        defaultValue: 'SUPERVISOR'
    },
    PROFILE_GUEST_LABEL: {
        key: 'sumaris.enumeration.UserProfile.GUEST.label',
        label: 'CONFIGURATION.OPTIONS.PROFILE.GUEST',
        type: 'string',
        defaultValue: 'GUEST'
    }
});
//# sourceMappingURL=core.config.js.map