import type { IDisputeRecord } from "@/lib/db/models/dispute-record.model";
import { Dispute } from "./dispute";

export class DisputeFactory {
  static create(props: IDisputeRecord): Dispute {
    return new Dispute(props);
  }
}
