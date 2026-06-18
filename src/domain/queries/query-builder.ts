import {
  Model,
  FilterQuery,
  Document,
  PopulateOptions,
  ClientSession,
} from "mongoose";

/**
 * A fluent, chainable query builder for Mongoose models.
 *
 * Wraps Mongoose's query API with a type-safe interface and controls the return
 * type at the type level — lean queries return plain `TLean` objects, while
 * non-lean queries return hydrated `TDocument` instances.
 *
 * @template TLean       - The plain object interface (e.g. `IUser`)
 * @template TDocument   - The Mongoose document type (e.g. `IUserDocument`). Defaults to `TLean & Document`
 * @template TIsLean     - Tracks whether `.lean()` is active. Drives return types on `execute`, `executeOne`, and `paginatedExecute`. Defaults to `true`
 *
 * @example
 * const users = await new QueryBuilder<IUser, IUserDocument>(UserModel)
 *   .where("isVerified", true)
 *   .sortBy("createdAt", "desc")
 *   .paginate(1, 20)
 *   .execute(); // → IUser[]
 */
export class QueryBuilder<
  TLean,
  TDocument extends Document = TLean & Document,
  TIsLean extends boolean = true,
> {
  private filters: FilterQuery<TDocument> = {};
  private projection: string | Record<string, number> = "";
  private queryOptions: {
    sort?: Record<string, 1 | -1 | "asc" | "desc">;
    skip?: number;
    limit?: number;
    populate: (string | PopulateOptions)[];
    lean: boolean;
  } = {
    populate: [],
    lean: true,
  };
  private session?: ClientSession | null;

  /**
   * @param model - The Mongoose model to query against
   */
  constructor(private model: Model<TDocument>) {}

  /**
   * Adds an exact equality filter: `{ field: value }`
   */
  where<K extends keyof TLean>(field: K, value: TLean[K]): this {
    this.filters = { ...this.filters, [field as string]: value };
    return this;
  }

  /**
   * Adds a case-insensitive regex filter on a string field.
   * Silently skips empty/whitespace-only patterns.
   *
   * @param flags - Regex flags. Defaults to `"i"` (case-insensitive)
   */
  whereLike<K extends keyof TLean>(
    field: K,
    pattern: string,
    flags = "i",
  ): this {
    const term = pattern?.trim();
    if (term) {
      this.filters = {
        ...this.filters,
        [field as string]: { $regex: new RegExp(term, flags) },
      };
    }
    return this;
  }

  /**
   * Adds a `$in` filter — matches documents where `field` is one of the given values.
   * Silently skips empty arrays.
   */
  whereIn<K extends keyof TLean>(field: K, values: TLean[K][]): this {
    if (values?.length) {
      this.filters = { ...this.filters, [field as string]: { $in: values } };
    }
    return this;
  }

  /**
   * Adds a `$nin` filter — excludes documents where `field` is one of the given values.
   * Silently skips empty arrays.
   */
  whereNotIn<K extends keyof TLean>(field: K, values: TLean[K][]): this {
    if (values?.length) {
      this.filters = { ...this.filters, [field as string]: { $nin: values } };
    }
    return this;
  }

  /**
   * Adds an inclusive range filter (`$gte` / `$lte`) on a field.
   * Useful for numeric ranges and date windows.
   */
  whereBetween<K extends keyof TLean>(
    field: K,
    min: TLean[K],
    max: TLean[K],
  ): this {
    this.filters = {
      ...this.filters,
      [field as string]: { $gte: min, $lte: max },
    };
    return this;
  }

  /**
   * Merges a raw Mongoose filter object directly into the query.
   * Use this as an escape hatch for operators the builder doesn't expose
   * natively (e.g. `$or`, `$and`, `$elemMatch`).
   */
  customFilter(rawFilter: FilterQuery<TDocument>): this {
    this.filters = { ...this.filters, ...rawFilter };
    return this;
  }

  /**
   * Limits the fields returned by the query.
   *
   * Accepts either a list of field names or a Mongoose-style projection object.
   *
   * @example
   * .select("firstName", "email")          // field list
   * .select({ firstName: 1, email: 1 })    // projection object
   */
  select<K extends keyof TLean>(...fields: K[]): this;
  select(projection: Partial<Record<keyof TLean, 1 | 0 | boolean>>): this;
  select(...fields: any[]): this {
    this.projection =
      fields.length === 1 &&
      typeof fields[0] === "object" &&
      !Array.isArray(fields[0])
        ? fields[0]
        : fields.join(" ");
    return this;
  }

  /**
   * Adds a sort criterion. Can be called multiple times for multi-field sorting.
   *
   * @param field     - The field to sort by. Accepts model keys plus `"createdAt"` and `"updatedAt"`
   * @param direction - `"asc"` (default) or `"desc"`
   */
  sortBy(
    field: keyof TLean | "createdAt" | "updatedAt" | (string & {}),
    direction: "asc" | "desc" = "asc",
  ): this {
    if (!this.queryOptions.sort) this.queryOptions.sort = {};
    this.queryOptions.sort[field as string] = direction === "asc" ? 1 : -1;
    return this;
  }

  /**
   * Applies cursor-based pagination by computing `skip` and `limit` from a
   * 1-indexed page number. Both values are clamped to a minimum of `1`.
   */
  paginate(page: number, limit: number): this {
    const validPage = Math.max(1, page);
    const validLimit = Math.max(1, limit);
    this.queryOptions.skip = (validPage - 1) * validLimit;
    this.queryOptions.limit = validLimit;
    return this;
  }

  /**
   * Adds a populate path to the query for referenced document resolution.
   * Can be called multiple times to populate several paths.
   *
   * @example
   * .populate("store")
   * .populate({ path: "store", select: "name logo" })
   */
  populate(
    path: string | PopulateOptions | (string | PopulateOptions)[],
  ): this {
    this.queryOptions.populate.push(path as any);
    return this;
  }

  /**
   * Toggles lean mode and re-brands the builder's `TIsLean` type parameter,
   * which in turn changes the return types of `execute`, `executeOne`,
   * and `paginatedExecute`.
   *
   * - `true`  → returns plain `TLean` objects (faster, no Mongoose overhead)
   * - `false` → returns hydrated `TDocument` instances (supports `.save()`, virtuals, etc.)
   *
   * Lean is `true` by default.
   */
  withLean<L extends boolean>(lean: L): QueryBuilder<TLean, TDocument, L> {
    this.queryOptions.lean = lean;
    return this as unknown as QueryBuilder<TLean, TDocument, L>;
  }

  /**
   * Attaches a Mongoose ClientSession to this query.
   * Required for transactional consistency (e.g., reading uncommitted writes).
   */
  withMongoDBsession(session: ClientSession | null): this {
    this.session = session;
    return this;
  }

  /**
   * Assembles the Mongoose query from all accumulated options.
   * Called internally by the public execution methods.
   */
  private buildQuery() {
    let query = this.model.find(this.filters, this.projection);

    if (this.queryOptions.sort) query = query.sort(this.queryOptions.sort);
    if (this.queryOptions.skip !== undefined)
      query = query.skip(this.queryOptions.skip);
    if (this.queryOptions.limit !== undefined)
      query = query.limit(this.queryOptions.limit);

    for (const pop of this.queryOptions.populate) {
      if (typeof pop === "string") {
        query = query.populate(pop);
      } else {
        query = query.populate(pop);
      }
    }

    if (this.queryOptions.lean) {
      query = query.lean() as any;
    }

    if (this.session) {
      query = query.session(this.session);
    }

    return query;
  }

  /**
   * Executes the query and returns all matching documents.
   *
   * @returns `TLean[]` when lean (default), `TDocument[]` when not
   */
  async execute(): Promise<TIsLean extends true ? TLean[] : TDocument[]> {
    return this.buildQuery() as any;
  }

  /**
   * Executes the query and returns the first matching document, or `null` if
   * none is found. Respects any active `sortBy`, `where`, and `populate` options.
   *
   * @returns `TLean | null` when lean (default), `TDocument | null` when not
   */
  async executeOne(): Promise<
    TIsLean extends true ? TLean | null : TDocument | null
  > {
    const results = await this.buildQuery().limit(1);
    return (results[0] ?? null) as any;
  }

  /**
   * Executes the query and a count in parallel, returning both in a single call.
   * Prefer this over separate `execute()` + `count()` calls for paginated list endpoints.
   *
   * @returns `{ data, total }` where `data` respects the lean flag and `total` is the unsliced count
   */
  async paginatedExecute(): Promise<{
    data: TIsLean extends true ? TLean[] : TDocument[];
    total: number;
  }> {
    const [data, total] = await Promise.all([
      this.buildQuery(),
      this.model.countDocuments(this.filters),
    ]);
    return { data: data as any, total };
  }

  /**
   * Returns the total number of documents matching the current filters,
   * without fetching any document data.
   */
  async count(): Promise<number> {
    return this.model.countDocuments(this.filters);
  }
}
