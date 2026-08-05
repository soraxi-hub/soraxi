import type mongoose from "mongoose";

import { MessageParticipantKindEnum } from "@/enums";
import { getStoreModel } from "@/lib/db/models/store.model";
import { getUserModel } from "@/lib/db/models/user.model";

/**
 * ⚠️ BOUNDARY FILE — see `boundary/README` in `thread-context.service.ts` ⚠️
 *
 * Resolves a participant's contact details for outbound notifications.
 *
 * Contact data is deliberately **not** snapshotted onto the conversation, which
 * is the one place the snapshot rule is inverted. An email address is not a
 * historical fact about a thread — it is live account data, and it must follow
 * the account. Freezing it at thread creation would mean cheerfully mailing an
 * address the person changed months ago.
 *
 * The trade is acceptable because this runs only in the outbox drain, never on
 * a read path: it can never turn an inbox listing into an N+1.
 */
export interface ParticipantContact {
  email: string;
  /** First name for a customer, store name for a vendor. */
  name: string;
}

export class IdentityContactService {
  static async resolve(
    kind: MessageParticipantKindEnum,
    id: mongoose.Types.ObjectId | string,
  ): Promise<ParticipantContact | null> {
    if (kind === MessageParticipantKindEnum.User) {
      const User = await getUserModel();
      const user = await User.findById(id)
        .select("email firstName")
        .lean<{ email: string; firstName: string }>();

      return user ? { email: user.email, name: user.firstName } : null;
    }

    if (kind === MessageParticipantKindEnum.Store) {
      const Store = await getStoreModel();
      const store = await Store.findById(id)
        .select("storeEmail name")
        .lean<{ storeEmail: string; name: string }>();

      return store ? { email: store.storeEmail, name: store.name } : null;
    }

    // Admins are not emailed about ordinary messages.
    return null;
  }

  /**
   * `lastSeenAt` for the presence dot.
   *
   * Read on demand rather than snapshotted for the same reason as contact
   * details: it changes constantly and a frozen copy would be meaningless.
   */
  static async lastSeenAt(
    kind: MessageParticipantKindEnum,
    id: mongoose.Types.ObjectId | string,
  ): Promise<Date | undefined> {
    if (kind === MessageParticipantKindEnum.User) {
      const User = await getUserModel();
      const user = await User.findById(id)
        .select("lastSeenAt")
        .lean<{ lastSeenAt?: Date }>();

      return user?.lastSeenAt;
    }

    if (kind === MessageParticipantKindEnum.Store) {
      const Store = await getStoreModel();
      const store = await Store.findById(id)
        .select("lastSeenAt")
        .lean<{ lastSeenAt?: Date }>();

      return store?.lastSeenAt;
    }

    return undefined;
  }
}
