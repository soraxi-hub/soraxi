import {
  FundReleaseStatus,
  IFundRelease,
} from "@/lib/db/models/fund-release.model";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  BadgeCheck,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Cog,
  Package,
  RotateCcw,
  Timer,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { currencyOperations, formatNaira } from "@/lib/utils/naira";
import { ISubOrder } from "@/lib/db/models/order.model";
import Image from "next/image";
import { siteConfig } from "@/config/site";
import { IStore } from "@/lib/db/models/store.model";
import { JSX } from "react";
import { getTriggerLabel } from "@/lib/utils/fund-release-logic";

/**
 * Status Overview Card
 */
export function StatusOverviewCard({
  fundRelease,
  store,
}: {
  fundRelease: IFundRelease;
  store?: IStore;
}) {
  const statusConfig: Record<
    FundReleaseStatus,
    { label: string; description: string; color: string; icon: JSX.Element }
  > = {
    pending: {
      label: "Pending",
      description: "Waiting for conditions to be met",
      color:
        "bg-yellow-100 border-yellow-300 dark:bg-yellow-900 dark:border-yellow-700",
      icon: <Clock className="h-8 w-8 text-yellow-600 dark:text-yellow-300" />,
    },
    ready: {
      label: "Ready",
      description: "All conditions met, waiting to process",
      color:
        "bg-blue-100 border-blue-300 dark:bg-blue-900 dark:border-blue-700",
      icon: (
        <CheckCircle2 className="h-8 w-8 text-blue-600 dark:text-blue-300" />
      ),
    },
    processing: {
      label: "Processing",
      description: "Currently transferring funds",
      color:
        "bg-purple-100 border-purple-300 dark:bg-purple-900 dark:border-purple-700",
      icon: <Cog className="h-8 w-8 text-purple-600 dark:text-purple-300" />,
    },
    released: {
      label: "Released",
      description: "Successfully transferred to wallet",
      color:
        "bg-green-100 border-green-300 dark:bg-green-900 dark:border-green-700",
      icon: (
        <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-300" />
      ),
    },
    failed: {
      label: "Failed",
      description: "Transfer failed, investigation in progress",
      color: "bg-red-100 border-red-300 dark:bg-red-900 dark:border-red-700",
      icon: <XCircle className="h-8 w-8 text-red-600 dark:text-red-300" />,
    },
    reversed: {
      label: "Reversed",
      description: "Release was reversed due to dispute or chargeback",
      color:
        "bg-orange-100 border-orange-300 dark:bg-orange-900 dark:border-orange-700",
      icon: (
        <RotateCcw className="h-8 w-8 text-orange-600 dark:text-orange-300" />
      ),
    },
  };

  const config = statusConfig[fundRelease.status] ?? statusConfig.pending;

  return (
    <Card className={`border-2 ${config.color}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl">{config.label}</CardTitle>
            <CardDescription>{config.description}</CardDescription>
          </div>
          {config.icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Release ID
            </p>
            <p className="mt-1 font-mono text-sm text-foreground">
              {fundRelease._id.toString().slice(0, 12)}...
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Store</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {store?.name || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Store Tier
            </p>
            <p className="mt-1 capitalize text-sm font-medium text-foreground">
              {fundRelease.releaseRules?.storeTier || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Verification
            </p>
            <p className="mt-1 capitalize text-sm font-medium text-foreground">
              {fundRelease.releaseRules?.verificationStatus || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Trigger</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {getTriggerLabel(fundRelease.trigger)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Settlement Card
 */
export function SettlementCard({
  settlement,
}: {
  settlement: IFundRelease["settlement"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          Settlement Details
        </CardTitle>
        <CardDescription>Financial breakdown</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="rounded-lg bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800 p-4">
            <p className="text-sm font-medium text-muted-foreground">
              Total Settlement
            </p>
            <p className="mt-1 text-3xl font-bold text-green-700 dark:text-green-300">
              {formatNaira(settlement?.amount || 0)}
            </p>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Product Amount
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {formatNaira(
                  currencyOperations.add(
                    settlement?.amount || 0,
                    settlement?.commission || 0
                  )
                )}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Shipping
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {formatNaira(settlement?.shippingPrice || 0)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Commission
              </p>
              <p className="mt-1 text-lg font-semibold text-red-600 dark:text-red-400">
                -{formatNaira(settlement?.commission || 0)}
              </p>
            </div>
          </div>

          {/* Fee Details */}
          {(settlement?.appliedPercentageFee || settlement?.appliedFlatFee) && (
            <div className="border-t border-border pt-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Fees Applied
              </p>
              <div className="space-y-1 text-sm">
                {settlement?.appliedPercentageFee > 0 && (
                  <p className="text-muted-foreground">
                    Percentage Fee:{" "}
                    {formatNaira(settlement.appliedPercentageFee)}
                  </p>
                )}
                {settlement?.appliedFlatFee > 0 && (
                  <p className="text-muted-foreground">
                    Flat Fee: {formatNaira(settlement.appliedFlatFee)}
                  </p>
                )}
              </div>
            </div>
          )}

          {settlement?.notes && (
            <div className="border-t border-border pt-4">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Notes
              </p>
              <p className="text-sm text-foreground">{settlement.notes}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Conditions Card
 */
export function ConditionsCard({ fundRelease }: { fundRelease: IFundRelease }) {
  const conditions = fundRelease.conditionsMet || {};

  const conditionItems = [
    {
      key: "paymentCleared",
      label: "Payment Cleared",
      met: conditions.paymentCleared,
    },
    {
      key: "verificationComplete",
      label: "Verification Complete",
      met: conditions.verificationComplete,
    },
    {
      key: "deliveryConfirmed",
      label: "Delivery Confirmed",
      met: conditions.deliveryConfirmed,
    },
    // {
    //   key: "buyerProtectionExpired",
    //   label: "Buyer Protection Expired",
    //   met: conditions.buyerProtectionExpired,
    // },
    // {
    //   key: "noActiveDisputes",
    //   label: "No Active Disputes",
    //   met: conditions.noActiveDisputes,
    // },
    // {
    //   key: "noActiveReturns",
    //   label: "No Active Returns",
    //   met: conditions.noActiveReturns,
    // },
    // {
    //   key: "noChargebacks",
    //   label: "No Chargebacks",
    //   met: conditions.noChargebacks,
    // },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          Release Conditions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {conditionItems.map((item) => (
            <div
              key={item.key}
              className="flex items-center gap-3 rounded-lg bg-muted/50 p-3"
            >
              <div
                className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                  item.met
                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                    : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600"
                }`}
              >
                {item.met ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-300" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-400 dark:text-gray-600" />
                )}
              </div>
              <span
                className={`text-sm ${item.met ? "text-foreground font-medium" : "text-muted-foreground"}`}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Timeline Card
 */
export function TimelineCard({ fundRelease }: { fundRelease: IFundRelease }) {
  const events = [
    {
      label: "Order Placed",
      date: fundRelease.orderPlacedAt,
      icon: <Package className="h-5 w-5 text-primary" />,
    },
    {
      label: "Delivery Confirmed",
      date: fundRelease.deliveryConfirmedAt,
      icon: (
        <CheckCircle2 className="h-5 w-5 text-green-500 dark:text-green-300" />
      ),
    },
    {
      label: "Buyer Protection Expires",
      date: fundRelease.buyerProtectionExpiresAt,
      icon: <Timer className="h-5 w-5 text-orange-500 dark:text-orange-300" />,
    },
    {
      label: "Scheduled Release",
      date: fundRelease.scheduledReleaseTime,
      icon: <Calendar className="h-5 w-5 text-blue-500 dark:text-blue-300" />,
    },
    {
      label: "Actually Released",
      date: fundRelease.actualReleasedAt,
      icon: (
        <BadgeCheck className="h-5 w-5 text-green-500 dark:text-green-300" />
      ),
    },
  ].filter((e) => e.date);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-green-600" />
          Release Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.map((event, idx) => (
            <div key={idx} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="text-xl">{event.icon}</div>
                {idx < events.length - 1 && (
                  <div className="h-8 w-0.5 bg-green-200 dark:bg-green-800 my-2" />
                )}
              </div>
              <div className="flex-1 pt-1">
                <p className="text-sm font-medium text-foreground">
                  {event.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {event.date ? new Date(event.date).toLocaleString() : "—"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Products Card
 */
export function ProductsCard({ subOrder }: { subOrder: ISubOrder }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Products</CardTitle>
        <CardDescription>Items included in this order</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {subOrder.products?.map((product, idx) => (
            <div
              key={idx}
              className="flex gap-4 border-b border-border pb-4 last:border-0 last:pb-0"
            >
              <div className="h-20 w-20 rounded bg-muted flex-shrink-0 flex items-center justify-center text-xs text-muted-foreground">
                {product.productSnapshot?.images?.[0] ? (
                  <Image
                    src={
                      product.productSnapshot.images[0] ||
                      siteConfig.placeHolderImg
                    }
                    alt={product.productSnapshot.name}
                    width={72}
                    height={72}
                    className="h-full w-full object-cover rounded"
                  />
                ) : (
                  "No Image"
                )}
              </div>

              <div className="flex-1">
                <p className="font-medium text-foreground line-clamp-2">
                  {product.productSnapshot?.name || "Unknown"}
                </p>

                <p className="text-xs text-muted-foreground mt-1">
                  Store: {product.storeSnapshot?.name || "Unknown"}
                </p>
                <div className="mt-2 flex gap-4 text-sm">
                  <span className="text-muted-foreground">
                    Qty:{" "}
                    <span className="font-medium text-foreground">
                      {product.productSnapshot?.quantity}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    Price:{" "}
                    <span className="font-medium text-foreground">
                      {formatNaira(product.productSnapshot?.price || 0)}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          ))}

          {subOrder.shippingMethod && (
            <div className="mt-4">
              <p className="text-sm font-medium text-foreground mb-2">
                Shipping Method
              </p>
              <div className="text-sm">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-muted-foreground">
                    {subOrder.shippingMethod.name}
                  </span>
                  <span className="font-medium text-foreground">
                    {formatNaira(subOrder.shippingMethod.price || 0)}
                  </span>
                </div>
                <div className="sm:flex justify-between items-center hidden">
                  <span className="text-muted-foreground">Description:</span>
                  <span className="font-medium text-foreground">
                    {subOrder.shippingMethod.description || "—"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
