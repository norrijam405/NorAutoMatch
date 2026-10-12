export type TorqueSourcingClass =
  | "LOCAL_AVAILABLE"
  | "ORR_OKLAHOMA"
  | "ORR_OTHER_STATE"
  | "OUT_OF_NETWORK";

export type TorqueSourcingTruth = {
  sourcingClass: TorqueSourcingClass;
  customerFacingPosition: string;
  salespersonAction: string;
  mayNameHoldingStore: boolean;
  mayPromiseSameDay: boolean;
  requiresHumanVerification: boolean;
};

export function torqueSourcingTruth(input: {
  sourcingClass: TorqueSourcingClass;
  transferConfirmed?: boolean;
  sameDayConfirmed?: boolean;
}): TorqueSourcingTruth {
  switch (input.sourcingClass) {
    case "LOCAL_AVAILABLE":
      return {
        sourcingClass: "LOCAL_AVAILABLE",
        customerFacingPosition:
          "We have a matching vehicle available to work with. Present the verified vehicle details and invite the customer to the next step.",
        salespersonAction: "Verify the current VIN status before representing availability as current.",
        mayNameHoldingStore: false,
        mayPromiseSameDay: false,
        requiresHumanVerification: false,
      };

    case "ORR_OKLAHOMA":
      return {
        sourcingClass: "ORR_OKLAHOMA",
        customerFacingPosition:
          input.transferConfirmed && input.sameDayConfirmed
            ? "We can get the matching vehicle here by the end of the day. Keep the conversation centered on the vehicle and next step rather than the holding location."
            : "I found a matching vehicle in our network. We may be able to get it here today; let me verify the transfer timing before I promise that.",
        salespersonAction:
          "Verify the vehicle is still available and confirm same-day transfer feasibility with management before making a firm timing promise.",
        mayNameHoldingStore: false,
        mayPromiseSameDay: Boolean(input.transferConfirmed && input.sameDayConfirmed),
        requiresHumanVerification: true,
      };

    case "ORR_OTHER_STATE":
      return {
        sourcingClass: "ORR_OTHER_STATE",
        customerFacingPosition:
          "I found a strong match in our broader network. Let us first make sure the vehicle and numbers make sense, then we can work through the sourcing options.",
        salespersonAction:
          "Confirm inventory, transfer feasibility, transportation timing, and manager approval before presenting any specific sourcing promise.",
        mayNameHoldingStore: false,
        mayPromiseSameDay: false,
        requiresHumanVerification: true,
      };

    case "OUT_OF_NETWORK":
      return {
        sourcingClass: "OUT_OF_NETWORK",
        customerFacingPosition:
          "I found a vehicle that appears to match what you want. The best next step is to come in, drive a comparable vehicle, and make sure the numbers and equipment fit. If everything lines up, we can work on sourcing the exact vehicle for you.",
        salespersonAction:
          "Verify the external VIN and dealer status, invite the customer to test-drive a comparable unit, work the deal, and only then pursue dealer-to-dealer sourcing with management.",
        mayNameHoldingStore: false,
        mayPromiseSameDay: false,
        requiresHumanVerification: true,
      };
  }
}

export const torqueCustomerLanguageRules = [
  "Keep the conversation centered on whether NorAutoMatch can help the customer obtain the right vehicle, not where every candidate currently sits.",
  "Do not volunteer the holding dealership unless a salesperson needs it for internal sourcing or the customer directly asks.",
  "Never imply a vehicle is physically on-site when it is not.",
  "Never promise a transfer, reservation, pickup time, or same-day arrival until a human has verified it.",
  "For an Oklahoma Orr-network vehicle, same-day language may be used only after transfer and timing are confirmed.",
  "For out-of-network vehicles, invite the customer to test-drive a comparable vehicle and discuss numbers before pursuing external sourcing.",
  "A located VIN is evidence of a possible sourcing path, not proof that a transfer will be approved.",
] as const;
