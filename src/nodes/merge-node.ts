import { ExecContext } from "../core/execution";
import { Node } from "../core/node";
import { Merge } from "../requirement";

/**
 * Node that merges multiple states into a single state
 * @template State The state type
 */

export class MergeNode<State extends {}> extends Node<State[], State> {
  constructor(private readonly requirement: Merge<State>) {
    super();
  }

  /**
   * Executes the merge node
   * @param context The execution context
   * @returns A promise that resolves to the merged state, or undefined if not all parents have completed
   */
  async execAsync(context: ExecContext<State[]>): Promise<State | undefined> {
    // Only execute when we have all parent states
    if (context.state.length !== this.parents.size) {
      return undefined;
    }

    return context.trace.push(this.requirement.describe, async (trace) => {
      return this.requirement.merge(context.state);
    });
  }
}
