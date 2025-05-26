import { ExecContext, NodeExecution } from "./execution";
import { Trace } from "./trace";

/**
 * Error thrown when a node execution fails
 */
export class ExecError extends Error {}

/**
 * Base class for all nodes in the graph.
 * A node represents a computation that transforms input of type In to output of type Out.
 * @template In The input type of the node
 * @template Out The output type of the node
 */
export abstract class Node<In, Out> {
  private _parents: Set<Node<unknown, In>> = new Set();
  private _children: Set<Node<Out, unknown>> = new Set();

  /**
   * Gets the set of parent nodes that this node depends on
   * @returns A readonly set of parent nodes
   */
  public get parents(): Readonly<Set<Node<unknown, In>>> {
    return this._parents;
  }

  /**
   * Gets the set of child nodes that depend on this node
   * @returns A readonly set of child nodes
   */
  public get children(): Readonly<Set<Node<Out, unknown>>> {
    return this._children;
  }

  /**
   * Executes the node's computation asynchronously
   * @param context The execution context containing the input state and trace
   * @returns A promise that resolves to the output state, or undefined if execution fails
   */
  public abstract execAsync(context: ExecContext<In>): Promise<Out | undefined>;

  /**
   * Establishes a dependency relationship where this node depends on the given node
   * @param node The node to depend on
   * @returns The node that was added as a dependency
   */
  public dependsOn<T>(node: Node<T, In>): Node<T, In> {
    if (!this._parents.has(node)) {
      this._parents.add(node);
      node.then(this);
    }

    return node;
  }

  /**
   * Establishes a relationship where the given node depends on this node
   * @param node The node that should depend on this node
   * @returns The node that was added as a dependent
   */
  public then<T>(node: Node<Out, T>): Node<Out, T> {
    if (!this._children.has(node)) {
      this._children.add(node);
      node.dependsOn(this);
    }

    return node;
  }

  /**
   * Creates a new node execution for checking the node's behavior
   * @param input The input state to check
   * @param trace Optional trace for logging
   * @returns A new node execution instance
   */
  public check(input: In, trace?: Trace): NodeExecution<In, Out> {
    const exec = NodeExecution.build(this, undefined, trace);
    exec.start(input);
    return exec;
  }

  /**
   * Creates a new node execution for applying the node's computation
   * @param input The input state to process
   * @param trace Optional trace for logging
   * @returns A new node execution instance
   */
  public apply(input: In, trace?: Trace): NodeExecution<In, Out> {
    const exec = NodeExecution.build(this, undefined, trace);
    exec.start(input);
    return exec;
  }
}
