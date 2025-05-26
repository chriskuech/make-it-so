import { ExecContext } from "../core/execution";
import { Node } from "../core/node";
import { RequirementNode } from "../requirement-nodes";

/**
 * A node that encapsulates a complete requirement graph.
 * This allows for creating reusable subgraphs that can be composed into larger graphs.
 * @template A The input state type
 * @template B The output state type
 */
export class NestedGraphNode<A extends {}, B extends {}> extends Node<A, B> {
  /**
   * Creates a new nested graph
   * @param graph The requirement node that represents the complete graph
   */
  constructor(private readonly graph: RequirementNode<A, B>) {
    super();
  }

  /**
   * Executes the nested graph
   * @param context The execution context
   * @returns A promise that resolves to the output state, or undefined if execution fails
   */
  public execAsync(context: ExecContext<A>): Promise<B | undefined> {
    return this.graph.execAsync(context);
  }
}
