import { BaseVendorWallet, VendorWallet } from "./vendor-wallet.entity";
import { PublicToJSONVendorWalletType } from "./wallet-interface";

export class VendorWalletFactory {
  /**
   * Creates a base VendorWallet domain entity.
   */
  static createWallet(props: BaseVendorWallet): VendorWallet {
    return new VendorWallet(props);
  }

  /**
   * Creates a wallet and returns only the public contract.
   */
  static createPublicWallet(
    props: BaseVendorWallet,
  ): PublicToJSONVendorWalletType {
    return new VendorWallet(props).toJSON();
  }
}
