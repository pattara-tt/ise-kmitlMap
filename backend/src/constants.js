export const ROLE = Object.freeze({
  EXEC: "exec",
  MARKETING: "marketing",
  GIS: "gis",
  ADMIN: "admin",
  PR: "pr",
  REGISTRAR: "registrar",
  USER: "user",
});

export const MARKETING_COLLECTIONS = Object.freeze([
  "contracts", "broadcasts", "institutionAccess", "institutionAccessModules", "accessHistory",
]);

export const ACCESS_STATUS = Object.freeze(["active", "paused", "suspended"]);
