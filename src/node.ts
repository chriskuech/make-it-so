import { ExecContext, NodeExecution } from "./execution";
import { Trace } from "./trace";

export class ExecError extends Error {}

export abstract class Node<In, Out> {
  private _parents: Set<Node<unknown, In>> = new Set();
  private _children: Set<Node<Out, unknown>> = new Set();

  public get parents(): Readonly<Set<Node<unknown, In>>> {
    return this._parents;
  }

  public get children(): Readonly<Set<Node<Out, unknown>>> {
    return this._children;
  }

  public abstract execAsync(context: ExecContext<In>): Promise<Out | undefined>;

  public dependsOn<T>(node: Node<T, In>): Node<T, In> {
    if (!this._parents.has(node)) {
      this._parents.add(node);
      node.then(this);
    }

    return node;
  }

  public then<T>(node: Node<Out, T>): Node<Out, T> {
    if (!this._children.has(node)) {
      this._children.add(node);
      node.dependsOn(this);
    }

    return node;
  }

  public check(input: In, trace?: Trace): NodeExecution<In, Out> {
    const exec = NodeExecution.build(this, undefined, trace);
    exec.start(input);
    return exec;
  }

  public apply(input: In, trace?: Trace): NodeExecution<In, Out> {
    const exec = NodeExecution.build(this, undefined, trace);
    exec.start(input);
    return exec;
  }
}
