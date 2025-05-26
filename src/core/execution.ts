import { Node } from "./node";
import { Trace } from "./trace";

/**
 * Represents the possible states of a node execution
 */
type ExecutionLifecycle = "waiting" | "active" | "completed" | "failed";

/**
 * Manages the execution lifecycle of a node, handling dependencies and state transitions.
 * @template In The input type of the node
 * @template Out The output type of the node
 */
export class NodeExecution<In = {}, Out = {}> {
  private _lifecycle: ExecutionLifecycle = "waiting";
  private waitingOn: Set<NodeExecution<unknown, In>> = new Set();
  private awaitedBy: Set<NodeExecution<Out, unknown>> = new Set();
  private input?: In;
  private output?: Out;

  /**
   * Creates a new node execution instance
   * @param node The node to execute
   * @param trace The trace for logging execution details
   */
  constructor(
    private readonly node: Node<In, Out>,
    private readonly trace: Trace
  ) {}

  /**
   * Gets the current lifecycle state of the execution
   * @returns The current lifecycle state
   */
  public get lifecycle() {
    return this._lifecycle;
  }

  /**
   * Called when a dependency completes its execution
   * @param dependency The completed dependency execution
   */
  public onDependencyComplete(dependency: NodeExecution<unknown, In>) {
    this.waitingOn.delete(dependency);
    this.input = { ...this.input, ...dependency.output! };

    if (this.waitingOn.size === 0) {
      this.transitionToActive();
    }
  }

  /**
   * Starts the execution with the given initial state
   * @param initial The initial input state
   * @throws Error if there are unmet dependencies
   */
  public async start(initial: In) {
    if (this.waitingOn.size > 0) {
      throw new Error("Node cannot start due to unmet dependencies.");
    }
    this.input = initial;
    await this.transitionToActive();
  }

  /**
   * Transitions the execution to the active state and executes the node
   */
  private async transitionToActive() {
    this._lifecycle = "active";

    this.output = await this.node.execAsync({
      state: this.input!,
      trace: this.trace,
    });

    if (this.output) {
      await this.transitionToCompleted();
    } else {
      await this.transitionToFailed();
    }
  }

  /**
   * Transitions the execution to the completed state and notifies dependents
   */
  private async transitionToCompleted() {
    this._lifecycle = "completed";

    for (const node of this.awaitedBy) {
      this.awaitedBy.delete(node);
      node.onDependencyComplete(this);
    }
  }

  /**
   * Transitions the execution to the failed state
   */
  private async transitionToFailed() {
    this._lifecycle = "failed";
  }

  /**
   * Builds a complete execution graph for a node and its dependencies
   * @param node The root node to build the execution graph for
   * @param visited Map of already visited nodes to their executions
   * @param trace The trace for logging execution details
   * @returns The root node execution
   */
  public static build<In, Out>(
    node: Node<In, Out>,
    visited: Map<
      Node<unknown, unknown>,
      NodeExecution<unknown, unknown>
    > = new Map(),
    trace: Trace = new Trace()
  ): NodeExecution<In, Out> {
    if (!visited.has(node)) {
      const exec = new NodeExecution(node, trace);
      visited.set(node, exec);

      for (const child of node.children) {
        const childExec = NodeExecution.build(child, visited, trace);
        childExec.waitingOn.add(exec);
        exec.awaitedBy.add(childExec);
      }
    }

    return visited.get(node)! as NodeExecution<In, Out>;
  }
}

export type ExecContext<T> = {
  state: T;
  trace: Trace;
};
