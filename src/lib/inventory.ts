export type Vehicle = {
  id: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  price: number;
  type: "SUV" | "Sedan" | "Truck";
  mileage: number;
  drivetrain: string;
  image: string;
  accent: string;
};

// Demonstration inventory for the matcher experience. Replace with an approved
// dealer feed before production launch. Photos are representative AI imagery.
export const inventory: Vehicle[] = [
  {
    id: "rogue-sv",
    year: 2025,
    make: "Nissan",
    model: "Rogue",
    trim: "SV",
    price: 29_800,
    type: "SUV",
    mileage: 12,
    drivetrain: "FWD",
    image: "/images/rogue.jpg",
    accent: "Pearl White",
  },
  {
    id: "rav4-xle",
    year: 2024,
    make: "Toyota",
    model: "RAV4",
    trim: "XLE",
    price: 31_200,
    type: "SUV",
    mileage: 8_420,
    drivetrain: "AWD",
    image: "/images/rav4.jpg",
    accent: "Magnetic Gray",
  },
  {
    id: "accord-sport",
    year: 2024,
    make: "Honda",
    model: "Accord",
    trim: "Sport",
    price: 28_500,
    type: "Sedan",
    mileage: 6_840,
    drivetrain: "FWD",
    image: "/images/accord.jpg",
    accent: "Canyon Blue",
  },
  {
    id: "frontier-sv",
    year: 2025,
    make: "Nissan",
    model: "Frontier",
    trim: "Crew Cab SV",
    price: 34_500,
    type: "Truck",
    mileage: 18,
    drivetrain: "4x4",
    image: "/images/frontier.jpg",
    accent: "Baja Storm",
  },
  {
    id: "tacoma-sr5",
    year: 2024,
    make: "Toyota",
    model: "Tacoma",
    trim: "SR5 Double Cab",
    price: 36_000,
    type: "Truck",
    mileage: 12_360,
    drivetrain: "4x4",
    image: "/images/tacoma.jpg",
    accent: "Forest Green",
  },
  {
    id: "pathfinder-sl",
    year: 2025,
    make: "Nissan",
    model: "Pathfinder",
    trim: "SL",
    price: 42_000,
    type: "SUV",
    mileage: 9,
    drivetrain: "4WD",
    image: "/images/pathfinder.jpg",
    accent: "Scarlet Ember",
  },
];

export const makes = [...new Set(inventory.map((vehicle) => vehicle.make))];
export const bodyTypes = [...new Set(inventory.map((vehicle) => vehicle.type))];

export function estimateBuyingPower(monthlyPayment: number, downPayment: number, termMonths: number) {
  const monthlyRate = 0.07 / 12;
  const financedAmount = monthlyPayment * ((1 - Math.pow(1 + monthlyRate, -termMonths)) / monthlyRate);
  return Math.round(financedAmount + downPayment);
}

export function estimatePayment(price: number, downPayment: number, termMonths: number) {
  const monthlyRate = 0.07 / 12;
  const principal = Math.max(0, price - downPayment);
  return Math.round((principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths)));
}

export const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
