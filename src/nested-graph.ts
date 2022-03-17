import { ExecContext } from "./execution";
import { Node } from "./node";

export class NestedGraph<A extends {}, B extends {}> extends Node<A, B> {
  public execAsync(context: ExecContext<A>): Promise<B | undefined> {
    throw new Error("Method not implemented.");
  }
}
