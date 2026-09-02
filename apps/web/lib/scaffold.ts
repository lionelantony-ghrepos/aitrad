import { packageName as schemasPackage } from "@meridian/schemas";

export function scaffoldStatus(): string {
  return `Scaffold ready (${schemasPackage})`;
}
