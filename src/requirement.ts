export type Check<State> = (state: State) => Promise<boolean>;

export type Transform<From, To> = (state: From) => Promise<To>;

export type Do<State> = (state: State) => Promise<unknown>;

export type Log<State> = {
  describe: string | ((state: State) => string);
};

export type Assertion<State> = {
  describe: string;
  test: Check<State>;
};

export type Action<State> = {
  describe: string;
  set: Do<State>;
};

export type Derivation<From, To> = {
  describe: string;
  get: Transform<From, To>;
};

export type Resource<State> = {
  describe: string;
  test: Check<State>;
  set: Do<State>;
};
