import { Category, Subcategory } from "./categories";

/**
 * Mirrors ListingAgent/src/agent/prompts/category-spec-hints.ts.
 * Keep in sync manually — the frontend and backend are separate packages.
 *
 * Drives which spec/condition fields the Sell form renders for a given
 * category/subcategory. `specs` and `conditionDetails` stay free-form
 * objects on the backend — these are just the fields we choose to collect.
 */

export interface CategoryHints {
  specKeys: string[];
  conditionAspects: string[];
}

export const DEFAULT_HINTS: CategoryHints = {
  specKeys: [],
  conditionAspects: [
    "Visible wear, scratches, or damage",
    "Missing or damaged parts",
    "Whether it powers on / functions as expected",
    "Included accessories or original packaging",
  ],
};

export const CATEGORY_SPEC_HINTS: Partial<
  Record<Category, Partial<Record<Subcategory, CategoryHints>>>
> = {
  [Category.Electronics]: {
    [Subcategory.Laptops]: {
      specKeys: [
        "Processor",
        "RAM",
        "Storage Type",
        "Storage Capacity",
        "Screen Size",
        "Operating System",
      ],
      conditionAspects: [
        "Scratches, dents, or scuffs on the lid/base",
        "Screen condition (dead pixels, cracks, discoloration)",
        "Keyboard/trackpad wear or missing keys",
        "Battery health / charging behavior",
        "Powers on and boots normally",
        "Charger and original box included",
      ],
    },
    [Subcategory.Phones]: {
      specKeys: ["Storage", "RAM", "Color", "SIM Options", "Country Variant"],
      conditionAspects: [
        "Screen cracks, scratches, or discoloration",
        "Back panel / frame dents or scratches",
        "Battery health",
        "Face ID / fingerprint / buttons functioning",
        "Original charger, box, and bill included",
        "Prior repair history",
      ],
    },
    [Subcategory.Headphones]: {
      specKeys: ["Headphones Type", "Noise Cancelling", "Connectivity", "Color"],
      conditionAspects: [
        "Ear tips / ear cups wear, discoloration, or tears",
        "Charging case scuffs and hinge condition",
        "All pieces present (both buds, case, tips, cable)",
        "Charging and pairing behavior",
        "Original box and bill included",
      ],
    },
    [Subcategory.OtherTech]: {
      specKeys: ["Product Type", "Color", "Power Source"],
      conditionAspects: [
        "Visible cracks, chips, or missing parts",
        "Whether it powers on / operates as expected",
        "Accessories, controller, or charger included",
        "Original box and packaging",
      ],
    },
  },

  [Category.Furniture]: {
    [Subcategory.Sofas]: {
      specKeys: [
        "Sofa Type",
        "Material",
        "Seater Count",
        "Dimensions",
        "Recliner",
      ],
      conditionAspects: [
        "Stains, sagging, tears, or cracks in upholstery",
        "Frame stability and structural integrity",
        "Deep cleaning required",
        "Recliner/mechanism functioning (if applicable)",
      ],
    },
    [Subcategory.Beds]: {
      specKeys: [
        "Material",
        "Size",
        "Storage",
        "Mattress Included",
        "Mattress Type",
        "Mattress Thickness",
      ],
      conditionAspects: [
        "Frame scratches, dents, or structural damage",
        "Mattress stains, sagging, or odor",
        "Signs of bed bugs, termites, or mould",
        "Storage mechanism functioning (if applicable)",
      ],
    },
    [Subcategory.Wardrobes]: {
      specKeys: ["Material", "Dimensions", "Door Count", "Lockable"],
      conditionAspects: [
        "Scratches, dents, swelling, or water damage on panels",
        "Door alignment, hinges, and handles",
        "Shelves, rods, and drawers intact and sliding",
        "Signs of termites or mould",
      ],
    },
    [Subcategory.CoffeeTables]: {
      specKeys: [
        "Table Type",
        "Tabletop Material",
        "Frame Material",
        "Dimensions",
      ],
      conditionAspects: [
        "Tabletop scratches, chips, stains, or cracks",
        "Frame/leg stability, rust, or wobble",
        "Water rings or heat marks",
      ],
    },
    [Subcategory.HomeDecor]: {
      specKeys: ["Product Type", "Material", "Dimensions", "Color"],
      conditionAspects: [
        "Chips, cracks, fading, or discoloration",
        "All pieces of a set present",
        "Mounting hardware or fittings included",
      ],
    },
  },

  [Category.HomeAppliances]: {
    [Subcategory.Fridges]: {
      specKeys: ["Capacity (Liters)", "Door Type", "Star Rating"],
      conditionAspects: [
        "Dents, rust, or scratches on the body",
        "Door seal condition",
        "Cooling performance / major repairs done",
        "Interior condition (shelves, drawers intact)",
      ],
    },
    [Subcategory.AirCoolers]: {
      specKeys: ["Capacity (Litres)"],
      conditionAspects: [
        "Body cracks, dents, or discoloration",
        "Fan/motor functioning normally",
        "Water tank / cooling pad condition",
        "Known repairs or issues",
      ],
    },
  },
};

export function getCategoryHints(
  category?: Category,
  subcategory?: Subcategory | "",
): CategoryHints {
  const subMap = category ? CATEGORY_SPEC_HINTS[category] : undefined;
  return (subcategory && subMap?.[subcategory]) || DEFAULT_HINTS;
}

/** Turns a human label like "Storage Type" into a snake_case object key. */
export function toFieldKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
