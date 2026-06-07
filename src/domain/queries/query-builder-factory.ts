import { Document, Model } from "mongoose";
import { QueryBuilder } from "./query-builder";

export class QueryBuilderFactory {
  static queryBuilder<
    TLean,
    TDocument extends Document = TLean & Document,
    TIsLean extends boolean = true,
  >(model: Model<TDocument>): QueryBuilder<TLean, TDocument, TIsLean> {
    return new QueryBuilder<TLean, TDocument, TIsLean>(model);
  }
}
