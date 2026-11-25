// Public endpoint names for the isolated Whispers Staging project.
const targets = {
  database: ["postgres:", "postgresql:"],
  storage: ["https:"],
  auth: ["https:"],
};
const hosts = {
  database: "ep-blue-thunder-bgfcd7v8.c-9.eu-central-1.aws.neon.tech",
  storage: "br-winter-butterfly-bgqazjbj.storage.c-9.eu-central-1.aws.neon.tech",
  auth: "ep-blue-thunder-bgfcd7v8.neonauth.c-9.eu-central-1.aws.neon.tech",
};

export function requireStagingTarget(service, value) {
  const endpoint = new URL(value);
  if (endpoint.hostname !== hosts[service] || !targets[service].includes(endpoint.protocol)) {
    throw new Error("Expected the isolated Whispers Staging " + service + " endpoint.");
  }
}
