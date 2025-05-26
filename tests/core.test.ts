import { Node, ExecError } from "../src/core/node";
import { NodeExecution } from "../src/core/execution";
import { Trace } from "../src/core/trace";

describe("Node", () => {
  class TestNode extends Node<{ value: number }, { value: number }> {
    constructor(private readonly transform: (n: number) => number) {
      super();
    }

    async execAsync(context: {
      state: { value: number };
      trace: Trace;
    }): Promise<{ value: number } | undefined> {
      return { value: this.transform(context.state.value) };
    }
  }

  it("should establish parent-child relationships", () => {
    const parent = new TestNode((n) => n * 2);
    const child = new TestNode((n) => n + 1);

    parent.then(child);

    expect(parent.children).toContain(child);
    expect(child.parents).toContain(parent);
  });

  it("should not duplicate parent-child relationships", () => {
    const parent = new TestNode((n) => n * 2);
    const child = new TestNode((n) => n + 1);

    parent.then(child);
    parent.then(child);

    expect(parent.children.size).toBe(1);
    expect(child.parents.size).toBe(1);
  });

  it("should establish dependencies in both directions", () => {
    const parent = new TestNode((n) => n * 2);
    const child = new TestNode((n) => n + 1);

    child.dependsOn(parent);

    expect(parent.children).toContain(child);
    expect(child.parents).toContain(parent);
  });

  it("should execute a simple chain", async () => {
    const node1 = new TestNode((n) => n * 2);
    const node2 = new TestNode((n) => n + 1);
    node1.then(node2);

    const trace = new Trace();
    const exec = node1.check({ value: 5 });
    await exec.start({ value: 5 });

    expect(exec.lifecycle).toBe("completed");
  });
});

describe("NodeExecution", () => {
  class SuccessNode extends Node<{ value: number }, { value: number }> {
    async execAsync(context: {
      state: { value: number };
      trace: Trace;
    }): Promise<{ value: number }> {
      return context.state;
    }
  }

  class FailureNode extends Node<{ value: number }, { value: number }> {
    async execAsync(): Promise<undefined> {
      return undefined;
    }
  }

  it("should transition through lifecycle states", async () => {
    const node = new SuccessNode();
    const trace = new Trace();
    const exec = NodeExecution.build(node);

    expect(exec.lifecycle).toBe("waiting");
    await exec.start({ value: 1 });
    expect(exec.lifecycle).toBe("completed");
  });

  it("should handle execution failure", async () => {
    const node = new FailureNode();
    const trace = new Trace();
    const exec = NodeExecution.build(node);

    await exec.start({ value: 1 });
    expect(exec.lifecycle).toBe("failed");
  });

  it("should wait for dependencies", async () => {
    const parent = new SuccessNode();
    const child = new SuccessNode();
    parent.then(child);

    const trace = new Trace();
    const visited = new Map();
    const parentExec = NodeExecution.build(parent, visited, trace);
    const childExec = NodeExecution.build(child, visited, trace);

    expect(childExec.lifecycle).toBe("waiting");
    await parentExec.start({ value: 1 });
    expect(childExec.lifecycle).toBe("completed");
  });

  it("should throw when starting with unmet dependencies", async () => {
    const parent = new SuccessNode();
    const child = new SuccessNode();
    parent.then(child);

    const trace = new Trace();
    const visited = new Map();
    const parentExec = NodeExecution.build(parent, visited, trace);
    const childExec = NodeExecution.build(child, visited, trace);

    await expect(childExec.start({ value: 1 })).rejects.toThrow();
  });

  it("should build a complete execution graph", () => {
    const node1 = new SuccessNode();
    const node2 = new SuccessNode();
    const node3 = new SuccessNode();
    node1.then(node2);
    node2.then(node3);

    const trace = new Trace();
    const visited = new Map();
    const exec1 = NodeExecution.build(node1, visited, trace);
    const exec2 = NodeExecution.build(node2, visited, trace);
    const exec3 = NodeExecution.build(node3, visited, trace);

    // Verify the execution graph through lifecycle states
    expect(exec1.lifecycle).toBe("waiting");
    expect(exec2.lifecycle).toBe("waiting");
    expect(exec3.lifecycle).toBe("waiting");
  });
});
