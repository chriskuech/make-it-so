import {
  Log,
  Assertion,
  Action,
  Resource,
  Derivation,
  FanOut,
} from "./requirement";
import { Node } from "./core/node";
import { Trace } from "./core/trace";
import { ExecContext } from "./core/execution";
import { FanOutNode } from "./nodes/FanOutNode";
import { MergeNode } from "./nodes/MergeNode";

/**
 * Tests a condition and logs the result
 * @param trace The trace for logging
 * @param condition The condition to test
 * @returns A promise that resolves to the test result
 */
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

/**
 * Gets a value and logs the operation
 * @param trace The trace for logging
 * @param transform The function to get the value
 * @returns A promise that resolves to the value
 */
async function get<State>(
  trace: Trace,
  transform: () => Promise<State>
): Promise<State> {
  return trace.push("get", (trace) => trace.measure(transform));
}

/**
 * Creates a new log node with the given initial state
 * @param state The initial state
 * @returns A new log node
 */
export function define<T extends {}>(state: T): LogNode<T> {
  return new LogNode<typeof state>({
    describe: "Starting",
  });
}

/**
 * Creates a new merge node that combines multiple states
 * @param describe Description of the merge operation
 * @param merge Function to merge the states
 * @returns A new merge node
 */
export function merge<T extends {}>(
  describe: string,
  merge: (states: T[]) => Promise<T>
): MergeNode<T> {
  return new MergeNode({ describe, merge });
}

/**
 * Base class for all requirement nodes.
 * Provides methods for chaining different types of requirements.
 * @template A The input state type
 * @template B The output state type
 */
export abstract class RequirementNode<A extends {}, B extends {}> extends Node<
  A,
  B
> {
  /**
   * Adds an assertion requirement to the chain
   * @param requirement The assertion requirement
   * @returns A new requirement node
   */
  assert(requirement: Assertion<B>): RequirementNode<B, B> {
    const node = new AssertionNode(requirement);
    this.then(node);
    return node;
  }

  /**
   * Adds an action requirement to the chain
   * @param requirement The action requirement
   * @returns A new requirement node
   */
  act(requirement: Action<B>): RequirementNode<B, B> {
    const node = new ActionNode(requirement);
    this.then(node);
    return node;
  }

  /**
   * Adds a derivation requirement to the chain
   * @param requirement The derivation requirement
   * @returns A new derivation node
   */
  derive<C extends {}>(requirement: Derivation<B, C>): DerivationNode<B, C> {
    const node = new DerivationNode(requirement);
    this.then(node);
    return node;
  }

  /**
   * Adds a resource requirement to the chain
   * @param requirement The resource requirement
   * @returns A new resource node
   */
  declare(requirement: Resource<B>): ResourceNode<B> {
    const node = new ResourceNode(requirement);
    this.then(node);
    return node;
  }

  /**
   * Adds a log requirement to the chain
   * @param requirement The log requirement
   * @returns A new requirement node
   */
  log(requirement: Log<B>): RequirementNode<B, B> {
    const node = new LogNode<B>(requirement);
    this.then(node);
    return node;
  }

  /**
   * Adds a fan-out requirement to the chain
   * @param requirements The fan-out requirements
   * @returns A new fan-out node
   */
  fanOut(...requirements: FanOut<B>[]): FanOutNode<B> {
    const node = new FanOutNode(requirements);
    this.then(node);
    return node;
  }
}

/**
 * Node that logs messages about the state
 * @template T The state type
 */
export class LogNode<T extends {}> extends RequirementNode<T, T> {
  constructor(private readonly requirement: Log<T>) {
    super();
  }
  /**
   * Executes the log node
   * @param context The execution context
   * @returns A promise that resolves to the state
   */
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

/**
 * Node that asserts a condition on the state
 * @template T The state type
 */
export class AssertionNode<T extends {}> extends RequirementNode<T, T> {
  constructor(private readonly requirement: Assertion<T>) {
    super();
  }
  /**
   * Executes the assertion node
   * @param context The execution context
   * @returns A promise that resolves to the state if the assertion passes, or undefined if it fails
   */
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

/**
 * Node that performs an action on the state
 * @template State The state type
 */
export class ActionNode<State extends {}> extends RequirementNode<
  State,
  State
> {
  constructor(private readonly requirement: Action<State>) {
    super();
  }
  /**
   * Executes the action node
   * @param context The execution context
   * @returns A promise that resolves to the state
   */
  async execAsync({ trace, state }: ExecContext<State>) {
    const mutation = () => this.requirement.set(state);
    await trace.push(this.requirement.describe, (trace) =>
      set(trace, mutation)
    );
    return state;
  }
}

/**
 * Node that derives a new state from the current state
 * @template From The input state type
 * @template To The output state type
 */
export class DerivationNode<
  From extends {},
  To extends {}
> extends RequirementNode<From, To> {
  constructor(private readonly requirement: Derivation<From, To>) {
    super();
  }
  /**
   * Executes the derivation node
   * @param context The execution context
   * @returns A promise that resolves to the derived state
   */
  execAsync({ trace, state }: ExecContext<From>) {
    const derivation = () => this.requirement.get(state);
    return trace.push(this.requirement.describe, (trace) =>
      get(trace, derivation)
    );
  }
}

/**
 * Node that manages a resource state
 * @template State The state type
 */
export class ResourceNode<State extends {}> extends RequirementNode<
  State,
  State
> {
  constructor(private readonly requirement: Resource<State>) {
    super();
  }
  /**
   * Executes the resource node
   * @param context The execution context
   * @returns A promise that resolves to the state if the resource is ready, or undefined if it fails
   */
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
