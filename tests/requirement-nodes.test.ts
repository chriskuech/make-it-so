import { Trace } from "../src/core/trace";
import { ExecContext } from "../src/core/execution";
import { merge } from "../src/requirement-nodes";
import { FanOutNode } from "../src/nodes/fan-out-node";

describe("FanOutNode", () => {
  it("should execute multiple requirements in parallel", async () => {
    const mockTrace = {
      push: jest
        .fn()
        .mockImplementation((_: string, fn: () => Promise<any>) => fn()),
      log: jest.fn(),
      logState: jest.fn(),
      measure: jest.fn(),
    } as unknown as Trace;

    const mockBranches = [
      {
        execAsync: jest.fn().mockResolvedValue({ value: 1 }),
      },
      {
        execAsync: jest.fn().mockResolvedValue({ value: 2 }),
      },
    ];

    const requirements = [
      {
        describe: "Branch 1",
        branches: jest.fn().mockResolvedValue([mockBranches[0]]),
      },
      {
        describe: "Branch 2",
        branches: jest.fn().mockResolvedValue([mockBranches[1]]),
      },
    ];

    const node = new FanOutNode(requirements);
    const context: ExecContext<{ value: number }> = {
      trace: mockTrace,
      state: { value: 0 },
    };

    const result = await node.execAsync(context);

    expect(result).toEqual([{ value: 1 }, { value: 2 }]);
    expect(mockTrace.push).toHaveBeenCalledTimes(2);
    expect(requirements[0].branches).toHaveBeenCalledWith({ value: 0 });
    expect(requirements[1].branches).toHaveBeenCalledWith({ value: 0 });
    expect(mockBranches[0].execAsync).toHaveBeenCalledWith(context);
    expect(mockBranches[1].execAsync).toHaveBeenCalledWith(context);
  });

  it("should filter out undefined results", async () => {
    const mockTrace = {
      push: jest
        .fn()
        .mockImplementation((_: string, fn: () => Promise<any>) => fn()),
      log: jest.fn(),
      logState: jest.fn(),
      measure: jest.fn(),
    } as unknown as Trace;

    const mockBranches = [
      {
        execAsync: jest.fn().mockResolvedValue({ value: 1 }),
      },
      {
        execAsync: jest.fn().mockResolvedValue(undefined),
      },
    ];

    const requirements = [
      {
        describe: "Branch",
        branches: jest.fn().mockResolvedValue(mockBranches),
      },
    ];

    const node = new FanOutNode(requirements);
    const context: ExecContext<{ value: number }> = {
      trace: mockTrace,
      state: { value: 0 },
    };

    const result = await node.execAsync(context);

    expect(result).toEqual([{ value: 1 }]);
  });
});

describe("MergeNode", () => {
  it("should merge states from all parents", async () => {
    const mockTrace = {
      push: jest
        .fn()
        .mockImplementation((_: string, fn: () => Promise<any>) => fn()),
      log: jest.fn(),
      logState: jest.fn(),
      measure: jest.fn(),
    } as unknown as Trace;

    const mockMerge = jest
      .fn()
      .mockImplementation((states: { value: number }[]) => ({
        values: states.map((s) => s.value),
      }));

    const node = merge("Merge states", mockMerge);
    const context: ExecContext<{ value: number }[]> = {
      trace: mockTrace,
      state: [{ value: 1 }, { value: 2 }],
    };

    // Mock parents
    Object.defineProperty(node, "parents", {
      get: () => new Set([{}, {}]),
    });

    const result = await node.execAsync(context);

    expect(result).toEqual({ values: [1, 2] });
    expect(mockTrace.push).toHaveBeenCalledWith(
      "Merge states",
      expect.any(Function)
    );
    expect(mockMerge).toHaveBeenCalledWith([{ value: 1 }, { value: 2 }]);
  });

  it("should return undefined if not all parents have completed", async () => {
    const mockTrace = {
      push: jest
        .fn()
        .mockImplementation((_: string, fn: () => Promise<any>) => fn()),
      log: jest.fn(),
      logState: jest.fn(),
      measure: jest.fn(),
    } as unknown as Trace;

    const mockMerge = jest.fn();

    const node = merge("Merge states", mockMerge);
    const context: ExecContext<{ value: number }[]> = {
      trace: mockTrace,
      state: [{ value: 1 }],
    };

    // Mock parents (more parents than states)
    Object.defineProperty(node, "parents", {
      get: () => new Set([{}, {}, {}]),
    });

    const result = await node.execAsync(context);

    expect(result).toBeUndefined();
    expect(mockTrace.push).not.toHaveBeenCalled();
    expect(mockMerge).not.toHaveBeenCalled();
  });
});
