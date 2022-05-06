import { Log, Assertion, Action, Resource, Derivation } from "./requirement";
import { Node } from "./node";
import { Trace } from "./trace";
import { ExecContext } from "./execution";

function test(
  trace: Trace,
  condition: () => Promise<boolean>
): Promise<boolean> {
  return trace.push("test", async (trace) => {
    const shouldAct = await trace.measure(condition);
    trace.logState(shouldAct);
    return shouldAct;
  });
}

async function set(trace: Trace, action: () => Promise<any>): Promise<any> {
  return trace.push("set", (trace) => trace.measure(action));
}

async function get<State>(
  trace: Trace,
  transform: () => Promise<State>
): Promise<State> {
  return trace.push("get", (trace) => trace.measure(transform));
}

export function define<T = {}>(state: T = {}): LogNode<T> {
  const node = new LogNode<typeof state>({
    describe: "Starting",
  });
  return node;
}

export abstract class RequirementNode<A extends {}, B extends {}> extends Node<
  A,
  B
> {
  assert(requirement: Assertion<B>): RequirementNode<B, B> {
    const node = new AssertionNode(requirement);
    this.then(node);
    return node;
  }

  act(requirement: Action<B>): RequirementNode<B, B> {
    const node = new ActionNode(requirement);
    this.then(node);
    return node;
  }

  derive<C>(requirement: Derivation<B, C>): DerivationNode<B, C> {
    const node = new DerivationNode(requirement);
    this.then(node);
    return node;
  }

  declare(requirement: Resource<B>): ResourceNode<B> {
    const node = new ResourceNode(requirement);
    this.then(node);
    return node;
  }

  log(requirement: Log<B>): RequirementNode<B, B> {
    const node = new LogNode<B>(requirement);
    this.then(node);
    return node;
  }
}

export class LogNode<T> extends RequirementNode<T, T> {
  constructor(private readonly requirement: Log<T>) {
    super();
  }
  execAsync(context: ExecContext<T>): Promise<T> {
    const { state, trace } = context;
    const message =
      typeof this.requirement.describe === "string"
        ? this.requirement.describe
        : this.requirement.describe(state);
    trace.log(message);
    return Promise.resolve(state);
  }
}

export class AssertionNode<T extends {}> extends RequirementNode<T, T> {
  constructor(private readonly requirement: Assertion<T>) {
    super();
  }
  async execAsync(context: ExecContext<T>) {
    const { trace, state } = context;
    const condition = () => this.requirement.test(state);
    const success = await trace.push(this.requirement.describe, (trace) =>
      test(trace, condition)
    );
    if (success) {
      return state;
    }
  }
}

export class ActionNode<State> extends RequirementNode<State, State> {
  constructor(private readonly requirement: Action<State>) {
    super();
  }
  async execAsync({ trace, state }: ExecContext<State>) {
    const mutation = () => this.requirement.set(state);
    await trace.push(this.requirement.describe, (trace) =>
      set(trace, mutation)
    );
    return state;
  }
}

export class DerivationNode<From, To> extends RequirementNode<From, To> {
  constructor(private readonly requirement: Derivation<From, To>) {
    super();
  }
  execAsync({ trace, state }: ExecContext<From>) {
    const derivation = () => this.requirement.get(state);
    return trace.push(this.requirement.describe, (trace) =>
      get(trace, derivation)
    );
  }
}

export class ResourceNode<State> extends RequirementNode<State, State> {
  constructor(private readonly requirement: Resource<State>) {
    super();
  }
  execAsync(context: ExecContext<State>) {
    const { trace, state } = context;
    const condition = () => this.requirement.test(state);
    const mutation = () => this.requirement.set(state);
    return trace.push(this.requirement.describe, async (trace) => {
      if (await test(trace, condition)) {
        return state;
      }
      await set(trace, mutation);
      if (await test(trace, condition)) {
        return state;
      }
    });
  }
}
