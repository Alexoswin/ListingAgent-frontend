/**
 * Mirrors ListingAgent/src/listings/enums/category.enum.ts.
 * Keep in sync manually — the frontend and backend are separate packages.
 */

export enum Category {
  Electronics = "electronics",
  Furniture = "furniture",
  HomeAppliances = "home-appliances",
}

export enum Subcategory {
  Laptops = "Laptops",
  Phones = "Phones",
  Sofas = "Sofas",
  Beds = "Beds",
  Fridges = "Fridges",
  AirCoolers = "Air Coolers",
}

export const CATEGORY_LABELS: Record<Category, string> = {
  [Category.Electronics]: "Electronics",
  [Category.Furniture]: "Furniture",
  [Category.HomeAppliances]: "Home Appliances",
};

export const CATEGORY_SUBCATEGORIES: Record<Category, Subcategory[]> = {
  [Category.Electronics]: [Subcategory.Laptops, Subcategory.Phones],
  [Category.Furniture]: [Subcategory.Sofas, Subcategory.Beds],
  [Category.HomeAppliances]: [Subcategory.Fridges, Subcategory.AirCoolers],
};
