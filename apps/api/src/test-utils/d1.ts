type MockResult<T> = D1Result<T>;

export function createResult<T>(results: T[]): MockResult<T> {
  return {
    meta: {},
    results,
    success: true
  } as MockResult<T>;
}

type MockDbOptions = {
  allResponses?: unknown[][];
  dbBatchResponses?: Array<D1Result<unknown>[]>;
  runResponses?: Array<D1Result<unknown>>;
};

class MockPreparedStatement {
  boundValues: unknown[] = [];

  constructor(
    readonly query: string,
    private readonly resolveAll: () => unknown[],
    private readonly resolveFirst: () => unknown,
    private readonly resolveRun: () => D1Result<unknown>
  ) {}

  bind(...values: unknown[]) {
    this.boundValues = values;
    return this;
  }

  async first<T>() {
    return this.resolveFirst() as T | null;
  }

  async all<T>() {
    return createResult<T>(this.resolveAll() as T[]);
  }

  async raw<T>() {
    return [] as T[];
  }

  async run<T>() {
    return this.resolveRun() as D1Result<T>;
  }
}

class MockSession {
  batchCalls: MockPreparedStatement[][] = [];
  preparedStatements: MockPreparedStatement[] = [];

  constructor(private readonly batchResponses: Array<D1Result<unknown>[]>) {}

  prepare(query: string) {
    const statement = new MockPreparedStatement(
      query,
      () => [],
      () => null,
      () => createResult<never>([])
    );
    this.preparedStatements.push(statement);
    return statement;
  }

  async batch<T>(statements: D1PreparedStatement[]) {
    this.batchCalls.push(statements as unknown as MockPreparedStatement[]);
    const nextResponse = this.batchResponses.shift();

    if (!nextResponse) {
      throw new Error("No mock batch response configured.");
    }

    return nextResponse as D1Result<T>[];
  }

  getBookmark() {
    return null;
  }
}

export class MockDb {
  batchCalls: MockPreparedStatement[][] = [];
  prepareCalls: MockPreparedStatement[] = [];
  sessions: MockSession[] = [];
  sessionConstraints: string[] = [];
  private readonly allResponses: unknown[][];
  private readonly dbBatchResponses: Array<D1Result<unknown>[]>;
  private readonly firstResponses: unknown[];
  private readonly runResponses: Array<D1Result<unknown>>;

  constructor(
    private readonly batchResponses: Array<D1Result<unknown>[]>,
    firstResponses: unknown[] = [],
    options: MockDbOptions = {}
  ) {
    this.allResponses = [...(options.allResponses ?? [])];
    this.dbBatchResponses = [...(options.dbBatchResponses ?? [])];
    this.firstResponses = [...firstResponses];
    this.runResponses = [...(options.runResponses ?? [])];
  }

  withSession(constraint?: string) {
    this.sessionConstraints.push(constraint ?? "");
    const session = new MockSession(this.batchResponses);
    this.sessions.push(session);
    return session;
  }

  prepare(query: string) {
    const statement = new MockPreparedStatement(
      query,
      () => (this.allResponses.shift() ?? []) as unknown[],
      () => this.firstResponses.shift() ?? null,
      () =>
        (this.runResponses.shift() ?? createResult<never>([])) as D1Result<unknown>
    );
    this.prepareCalls.push(statement);
    return statement;
  }

  async batch(statements: D1PreparedStatement[]) {
    this.batchCalls.push(statements as unknown as MockPreparedStatement[]);
    const nextResponse = this.dbBatchResponses.shift();

    if (nextResponse) {
      return nextResponse as D1Result<Record<string, unknown>>[];
    }

    return statements.map(() => createResult<Record<string, unknown>>([]));
  }
}
