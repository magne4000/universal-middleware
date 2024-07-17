export { testRun };

import { expect, fetch, getServerUrl, run, test } from "@brillout/test-e2e";

function testRun(cmd: `pnpm run dev`) {
  run(cmd, {
    doNotFailOnWarning: true,
    serverIsReadyMessage: "ready",
  });

  test("/", async () => {
    const response = await fetch(getServerUrl() + "/");

    const content = await response.text();

    expect(content).toContain('"something"');
    expect(response.headers.has("x-custom-header")).toBe(true);
  });
}

testRun("pnpm run dev");
