import { z } from 'zod';

const jsonObjectSchema = z.record(z.unknown());

const updateCondoProfileSchema = z
  .object({
    displayName: z.string().trim().min(1).max(160).optional(),
    legalName: z.string().trim().min(1).max(200).nullable().optional(),
    address: jsonObjectSchema.optional(),
    settings: jsonObjectSchema.optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.displayName !== undefined ||
      value.legalName !== undefined ||
      value.address !== undefined ||
      value.settings !== undefined,
    {
      message: 'At least one field must be provided',
    },
  );

export type UpdateCondoProfileInput = z.infer<typeof updateCondoProfileSchema>;

export function parseUpdateCondoProfileInput(body: unknown): UpdateCondoProfileInput {
  return updateCondoProfileSchema.parse(body);
}
