import { ExecContext } from "../core/execution";
import { Node } from "../core/node";
import { FanOut } from "../requirement";

/**
 * Node that executes multiple requirements in parallel
 * @template State The state type
 */

export class FanOutNode<State extends {}> extends Node<State, State[]> {
  constructor(private readonly requirements: FanOut<State>[]) {
    super();
  }

  /**
   * Executes the fan-out node
   * @param context The execution context
   * @returns A promise that resolves to an array of states from all successful branches
   */
  async execAsync({ trace, state }: ExecContext<State>): Promise<State[]> {
    // Execute all requirements in parallel
    const allBranches = await Promise.all(
      this.requirements.map(async (requirement) => {
        const branches = await trace.push(
          requirement.describe,
          async (trace) => {
            const nodes = await requirement.branches(state);
            return nodes;
          }
        );
        return branches;
      })
    );

    // Flatten all branches and execute them in parallel
    const branches = allBranches.flat();
    const results = await Promise.all(
      branches.map((node) => node.execAsync({ trace, state }))
    );

    // Filter out undefined results
    return results.filter(
      (result): result is NonNullable<typeof result> => result !== undefined
    );
  }
}
