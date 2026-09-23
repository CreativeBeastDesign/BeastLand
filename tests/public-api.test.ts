/**
 * Snapshots BeastLand's public API surface: every export name from
 * `src/lib/index.ts` paired with its runtime `typeof`. Dachsboard consumes
 * this package as a path dependency and imports names from it directly, so
 * a rename or removal here would otherwise only surface as a build failure
 * downstream. This test fails CI first, at the source, before that happens.
 *
 * Type-only exports (interfaces, type aliases) don't exist at runtime and
 * so don't appear as keys on the imported module — this snapshot only
 * covers value exports (components, functions, objects, constants).
 */
import { describe, expect, it } from "vitest";
import * as publicApi from "../src/lib/index.js";

describe("public API surface", () => {
	it("matches the known set of exported names and their runtime types", () => {
		const surface = Object.keys(publicApi)
			.sort()
			.map((name) => `${name}: ${typeof (publicApi as Record<string, unknown>)[name]}`);

		expect(surface).toMatchSnapshot();
	});
});
