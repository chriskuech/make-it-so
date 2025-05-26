import { RequirementNode } from "./requirement-nodes";

export type Check<State> = (state: State) => Promise<boolean>;

export type Transform<From, To> = (state: From) => Promise<To>;

export type Do<State> = (state: State) => Promise<unknown>;

/**
 * A requirement that logs information about the state
 * @template State The state type
 */
export interface Log<State> {
  /**
   * Description of the log message, either a static string or a function that generates a message
   */
  describe: string | ((state: State) => string);
}

/**
 * A requirement that asserts a condition on the state
 * @template State The state type
 */
export interface Assertion<State> {
  /**
   * Description of the assertion
   */
  describe: string;
  /**
   * Function that tests the condition
   * @param state The current state
   * @returns A promise that resolves to true if the assertion passes, false otherwise
   */
  test: (state: State) => Promise<boolean>;
}

/**
 * A requirement that performs an action on the state
 * @template State The state type
 */
export interface Action<State> {
  /**
   * Description of the action
   */
  describe: string;
  /**
   * Function that performs the action
   * @param state The current state
   * @returns A promise that resolves when the action is complete
   */
  set: (state: State) => Promise<unknown>;
}

/**
 * A requirement that derives a new state from the current state
 * @template From The input state type
 * @template To The output state type
 */
export interface Derivation<From, To> {
  /**
   * Description of the derivation
   */
  describe: string;
  /**
   * Function that derives the new state
   * @param state The current state
   * @returns A promise that resolves to the derived state
   */
  get: (state: From) => Promise<To>;
}

/**
 * A requirement that manages a resource state
 * @template State The state type
 */
export interface Resource<State> {
  /**
   * Description of the resource
   */
  describe: string;
  /**
   * Function that tests if the resource is ready
   * @param state The current state
   * @returns A promise that resolves to true if the resource is ready, false otherwise
   */
  test: (state: State) => Promise<boolean>;
  /**
   * Function that sets up the resource
   * @param state The current state
   * @returns A promise that resolves when the resource is set up
   */
  set: (state: State) => Promise<unknown>;
}

/**
 * A requirement that executes multiple branches in parallel
 * @template State The state type
 */
export interface FanOut<State extends {}> {
  /**
   * Description of the fan-out operation
   */
  describe: string;
  /**
   * Function that returns the branches to execute
   * @param state The current state
   * @returns A promise that resolves to an array of nodes to execute in parallel
   */
  branches: (state: State) => Promise<RequirementNode<State, State>[]>;
}

/**
 * A requirement that merges multiple states into a single state
 * @template State The state type
 */
export interface Merge<State extends {}> {
  /**
   * Description of the merge operation
   */
  describe: string;
  /**
   * Function that merges the states
   * @param states The states to merge
   * @returns A promise that resolves to the merged state
   */
  merge: (states: State[]) => Promise<State>;
}
