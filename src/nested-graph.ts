import { ExecContext } from "./execution";
import { Node } from "./node";
import { RequirementNode } from "./requirement-nodes";

export class NestedGraph<A extends {}, B extends {}> extends Node<A, B> {
  constructor(private readonly graph: RequirementNode<A, B>) {
    super();
  }

  public execAsync(context: ExecContext<A>): Promise<B | undefined> {
    return this.graph.execAsync(context);
  }
}
