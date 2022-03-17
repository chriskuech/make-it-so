import { Node } from "./node";
import { Trace } from "./trace";

type ExecutionLifecycle = "waiting" | "active" | "completed" | "failed";

export class NodeExecution<In = {}, Out = {}> {
  private _lifecycle: ExecutionLifecycle = "waiting";
  private waitingOn: Set<NodeExecution<unknown, In>> = new Set();
  private awaitedBy: Set<NodeExecution<Out, unknown>> = new Set();
  private input?: In;
  private output?: Out;

  constructor(
    private readonly node: Node<In, Out>,
    private readonly trace: Trace
  ) {}

  public get lifecycle() {
    return this._lifecycle;
  }

  public onDependencyComplete(dependency: NodeExecution<unknown, In>) {
    this.waitingOn.delete(dependency);
    this.input = { ...this.input, ...dependency.output! };

    if (this.waitingOn.size === 0) {
      this.transitionToActive();
    }
  }

  public start(initial: In) {
    if (this.waitingOn.size > 0) {
      throw "Node cannot start due to unmet dependencies.";
    }
    this.input = initial;
    this.transitionToActive();
  }

  private async transitionToActive() {
    this._lifecycle = "active";

    this.output = await this.node.execAsync({
      state: this.input!,
      trace: this.trace,
    });

    this.output ? this.transitionToCompleted() : this.transitionToFailed();
  }

  private async transitionToCompleted() {
    this._lifecycle = "completed";

    for (const node of this.awaitedBy) {
      this.awaitedBy.delete(node);
      node.onDependencyComplete(this);
    }
  }

  private async transitionToFailed() {
    this._lifecycle = "failed";
  }

  public static build<In, Out>(
    node: Node<In, Out>,
    visited: Map<Node<{}, {}>, NodeExecution> = new Map(),
    trace: Trace = new Trace(undefined, [console.log])
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
  // execution: Execution<{}>;
  state: T;
  trace: Trace;
};

// export class Execution<Initial extends State> {
//   public readonly waiting: Set<Node>;
//   public readonly active: Set<Node> = new Set();
//   public readonly completed: Set<Node> = new Set();
//   public readonly failed: Set<Node> = new Set();
//   private readonly trace: Trace = new Trace();
//   private startTime?: Date;
//   private stopTime?: Date;
//   private readonly states: Map<Node, State> = new Map();

//   constructor(public readonly initial: Node<Initial, unknown>) {
//     this.waiting = Execution.getAllNodes(initial);
//   }

//   get isRunning(): boolean {
//     return Boolean(this.startTime && !this.stopTime);
//   }

//   get isComplete(): boolean {
//     return Boolean(this.stopTime);
//   }

//   get isSuccess(): boolean {
//     return this.isComplete && this.failed.size === 0;
//   }

//   get executionTimeSecs(): number | null {
//     return this.isRunning
//       ? new Date().getSeconds() - this.startTime!.getSeconds()
//       : null;
//   }

//   canRun({ parents }: Node): boolean {
//     return ![...parents].some((node) => !this.completed.has(node));
//   }

//   start(state: Initial) {
//     this.startTime = new Date();
//     this.startNode<Initial, unknown>(this.initial, state);
//   }

//   private saveState<T>(node: Node<unknown, T>, state: T) {
//     this.states.set(node, { ...this.states.get(node), ...state });
//   }

//   private startNode<Before, After>(node: Node<Before, After>): void {
//     // Hack to allow returning void from async
//     // i.e. "fire and forget"
//     (async () => {
//       if (!this.canRun(node)) {
//         return;
//       }

//       this.waiting.delete(node);
//       this.active.add(node);

//       const state = this.states.get(node);
//       const after = await node.execAsync({ trace, state });

//       this.active.delete(node);
//       if (after === undefined) {
//         this.failed.add(node);
//         return;
//       }
//       this.completed.add(node);

//       for (const child of node.children) {
//         this.saveState(child, after);
//         this.startNode(child);
//       }

//       if (this.active.size === 0) {
//         this.stopTime = new Date();
//         const elapsedSecs =
//           this.stopTime!.getSeconds() - this.startTime!.getSeconds();
//         this.trace.log(`complete - ${elapsedSecs}secs`);
//       }
//     })();
//   }

//   private static getAllNodes(node: Node): Set<Node> {
//     const visited = new Set<Node>([node]);

//     (function visit(node) {
//       for (const child of node.children) {
//         if (!visited.has(child)) {
//           visited.add(child);
//           visit(child);
//         }
//       }
//     })(node);

//     return visited;
//   }
// }
