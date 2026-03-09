type MockResult<T> = D1Result<T>;

export function createResult<T>(results: T[]): MockResult<T> {
  return {
    meta: {},
    results,
    success: true
  } as MockResult<T>;
}

class MockPreparedStatement {
  boundValues: unknown[] = [];

  constructor(
    readonly query: string,
    private readonly firstValue: unknown = null
  ) {}

  bind(...values: unknown[]) {
    this.boundValues = values;
    return this;
  }

  async first<T>() {
    return this.firstValue as T | null;
  }

  async all<T>() {
    return createResult<T>([]);
  }

  async raw<T>() {
    return [] as T[];
  }

  async run<T>() {
    return createResult<T>([]);
  }
}

class MockSession {
  batchCalls: MockPreparedStatement[][] = [];
  preparedStatements: MockPreparedStatement[] = [];

  constructor(private readonly batchResponses: Array<D1Result<unknown>[]>) {}

  prepare(query: string) {
    const statement = new MockPreparedStatement(query);
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
  prepareCalls: MockPreparedStatement[] = [];
  sessions: MockSession[] = [];
  sessionConstraints: string[] = [];

  constructor(
    private readonly batchResponses: Array<D1Result<unknown>[]>,
    private readonly firstResponses: unknown[] = []
  ) {}

  withSession(constraint?: string) {
    this.sessionConstraints.push(constraint ?? "");
    const session = new MockSession(this.batchResponses);
    this.sessions.push(session);
    return session;
  }

  prepare(query: string) {
    const statement = new MockPreparedStatement(
      query,
      this.firstResponses.shift() ?? null
    );
    this.prepareCalls.push(statement);
    return statement;
  }
}
