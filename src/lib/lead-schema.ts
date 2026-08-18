import { z } from "zod";

export const leadSchema = z.object({
  firstName: z.string().trim().min(2).max(60),
  lastName: z.string().trim().min(2).max(60),
  email: z.string().trim().email(),
  phone: z.string().trim().min(10).max(24),
  budgetRange: z.string().trim().min(1),
  paymentMethod: z.enum(["Cash", "Financing", "Lease"]),
  tradeIn: z.string().trim().max(500).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
  source: z.string().trim().max(100).default("Website"),
  trigger: z.enum(["retail", "trapdoor"]),
  pipeline: z.enum(["Standard Retail", "Vehicle Sourcing"]),
  shortlistedVehicleIds: z.array(z.string()).max(20).default([]),
  monthlyTarget: z.number().min(0).max(5000).optional(),
  downPayment: z.number().min(0).max(100000).optional(),
  termMonths: z.number().min(12).max(120).optional(),
  consent: z.literal(true),
});

export type LeadPayload = z.infer<typeof leadSchema>;
