import { define } from "../dist/requirement-nodes";

const requirementGraph = define({});

requirementGraph
  .derive({
    describe: "Config is loaded",
    get: async ({}) => ({ hello: "world" }),
  })
  .assert({
    describe: "pass",
    test: async (state) => state.hello === "world",
  })
  .act({
    describe: "do",
    set: async (state) => 14,
  })
  .derive({
    describe: "der",
    get: async (state) => ({ ...state, c: "k" }),
  })
  .declare({
    describe: "resource",
    test: (resource) => Promise.resolve(resource.c === "k"),
    set: async () => null,
  })
  .log({
    describe: (state) => state.c,
  });

requirementGraph.check({ env: "sandbox" });

requirementGraph.apply({ env: "sandbox" });
