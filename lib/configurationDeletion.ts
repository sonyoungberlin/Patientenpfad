export type ConfigurationDependency = {
  id: string;
  name: string;
};

export type ConfigurationDeleteResult =
  | { status: "deleted" }
  | { status: "not_found" }
  | { status: "conflict"; error: string; dependencies: ConfigurationDependency[] };

export function configurationDeleteConflict(
  objectLabel: string,
  dependencyLabel: string,
  dependencies: ConfigurationDependency[],
): ConfigurationDeleteResult {
  const names = dependencies.map(({ name, id }) => `„${name}“ (${id})`).join(", ");
  return {
    status: "conflict",
    error: `${objectLabel} kann nicht gelöscht werden. Verwendet von ${dependencyLabel}: ${names}.`,
    dependencies,
  };
}