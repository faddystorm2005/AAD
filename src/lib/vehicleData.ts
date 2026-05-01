/**
 * Curated vehicle make/model dataset for the Add Vehicle form.
 *
 * Coverage target: 90%+ of vehicles likely to belong to AAD customers
 * in the Austin/Texas market. Heavy emphasis on trucks and large SUVs
 * since they're disproportionately common locally.
 *
 * Models within each make are listed in rough order of US sales volume,
 * not strictly alphabetical, to make the dropdown feel intuitive.
 *
 * If a customer's vehicle isn't here, the form falls back to freeform
 * Make + Model text inputs via the "Other / Not Listed" option.
 */

export const VEHICLE_MAKES: Record<string, string[]> = {
  Acura: ['TLX', 'MDX', 'RDX', 'ILX', 'ZDX', 'Integra', 'NSX'],
  Audi: ['A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'Q3', 'Q5', 'Q7', 'Q8', 'e-tron', 'RS5', 'RS7'],
  BMW: ['2 Series', '3 Series', '4 Series', '5 Series', '7 Series', '8 Series', 'X1', 'X3', 'X5', 'X6', 'X7', 'M3', 'M5', 'i4', 'iX'],
  Buick: ['Encore', 'Encore GX', 'Envision', 'Enclave'],
  Cadillac: ['CT4', 'CT5', 'XT4', 'XT5', 'XT6', 'Escalade', 'Escalade ESV', 'Lyriq'],
  Chevrolet: ['Spark', 'Malibu', 'Camaro', 'Corvette', 'Trax', 'Trailblazer', 'Equinox', 'Blazer', 'Traverse', 'Tahoe', 'Suburban', 'Colorado', 'Silverado 1500', 'Silverado 2500', 'Silverado 3500', 'Bolt EV'],
  Chrysler: ['300', 'Pacifica'],
  Dodge: ['Charger', 'Challenger', 'Durango', 'Hornet'],
  Ford: ['Mustang', 'Maverick', 'Ranger', 'F-150', 'F-150 Lightning', 'F-250', 'F-350', 'Escape', 'Bronco Sport', 'Bronco', 'Edge', 'Explorer', 'Expedition', 'Expedition MAX', 'Mustang Mach-E'],
  Genesis: ['G70', 'G80', 'G90', 'GV60', 'GV70', 'GV80'],
  GMC: ['Canyon', 'Sierra 1500', 'Sierra 2500', 'Sierra 3500', 'Terrain', 'Acadia', 'Yukon', 'Yukon XL', 'Hummer EV'],
  Honda: ['Civic', 'Accord', 'Insight', 'HR-V', 'CR-V', 'Passport', 'Pilot', 'Ridgeline', 'Odyssey', 'Prologue'],
  Hyundai: ['Accent', 'Elantra', 'Sonata', 'Venue', 'Kona', 'Tucson', 'Santa Fe', 'Palisade', 'Ioniq 5', 'Ioniq 6'],
  Infiniti: ['Q50', 'Q60', 'QX50', 'QX55', 'QX60', 'QX80'],
  Jeep: ['Compass', 'Cherokee', 'Grand Cherokee', 'Grand Cherokee L', 'Wrangler', 'Gladiator', 'Wagoneer', 'Grand Wagoneer', 'Renegade'],
  Kia: ['Rio', 'Forte', 'K5', 'Stinger', 'Soul', 'Seltos', 'Sportage', 'Sorento', 'Telluride', 'Carnival', 'EV6', 'EV9'],
  'Land Rover': ['Range Rover', 'Range Rover Sport', 'Range Rover Velar', 'Range Rover Evoque', 'Discovery', 'Discovery Sport', 'Defender'],
  Lexus: ['IS', 'ES', 'LS', 'NX', 'RX', 'GX', 'LX', 'RZ', 'RC'],
  Lincoln: ['Corsair', 'Nautilus', 'Aviator', 'Navigator', 'Navigator L'],
  Mazda: ['Mazda3', 'Mazda6', 'MX-5 Miata', 'CX-3', 'CX-30', 'CX-5', 'CX-50', 'CX-9', 'CX-90'],
  'Mercedes-Benz': ['A-Class', 'C-Class', 'E-Class', 'S-Class', 'CLA', 'CLS', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'G-Class', 'EQS', 'EQE'],
  Mini: ['Cooper', 'Clubman', 'Countryman'],
  Mitsubishi: ['Outlander', 'Outlander Sport', 'Eclipse Cross', 'Mirage'],
  Nissan: ['Versa', 'Sentra', 'Altima', 'Maxima', 'Kicks', 'Rogue', 'Murano', 'Pathfinder', 'Armada', 'Frontier', 'Titan', 'Leaf', 'Ariya', 'Z'],
  Porsche: ['718 Cayman', '911', 'Panamera', 'Macan', 'Cayenne', 'Taycan'],
  RAM: ['1500', '2500', '3500', 'ProMaster'],
  Subaru: ['Impreza', 'Legacy', 'WRX', 'Crosstrek', 'Forester', 'Outback', 'Ascent', 'Solterra', 'BRZ'],
  Tesla: ['Model 3', 'Model S', 'Model X', 'Model Y', 'Cybertruck'],
  Toyota: ['Corolla', 'Camry', 'Prius', 'GR86', 'Supra', 'Corolla Cross', 'RAV4', 'Venza', 'Highlander', '4Runner', 'Sequoia', 'Tacoma', 'Tundra', 'Sienna', 'bZ4X', 'Land Cruiser'],
  Volkswagen: ['Jetta', 'Passat', 'Arteon', 'Taos', 'Tiguan', 'Atlas', 'Atlas Cross Sport', 'ID.4', 'GTI', 'Golf R'],
  Volvo: ['S60', 'S90', 'V60', 'V90', 'XC40', 'XC60', 'XC90', 'EX30'],
};

// ---------------------------------------------------------------
// Authoritative size category for every model in VEHICLE_MAKES.
//
// Customers do NOT pick the size category at booking time -- it
// is determined here by make + model. Wrong category here means
// wrong pricing for that customer, so changes to this map should
// be deliberate.
//
// Categories:
//   small  = sedan, coupe, hatchback, subcompact crossover, wagon
//   suv    = mid-size or compact 5-seat SUV
//   truck  = pickup, 3-row SUV, full-size SUV/van, minivan
// ---------------------------------------------------------------
export const VEHICLE_MODEL_SIZES: Record<string, Record<string, 'small' | 'suv' | 'truck'>> = {
  Acura: {
    'TLX': 'small', 'ILX': 'small', 'Integra': 'small', 'NSX': 'small',
    'RDX': 'suv', 'ZDX': 'suv',
    'MDX': 'truck',
  },
  Audi: {
    'A3': 'small', 'A4': 'small', 'A5': 'small', 'A6': 'small', 'A7': 'small', 'A8': 'small', 'RS5': 'small', 'RS7': 'small',
    'Q3': 'suv', 'Q5': 'suv', 'e-tron': 'suv',
    'Q7': 'truck', 'Q8': 'truck',
  },
  BMW: {
    '2 Series': 'small', '3 Series': 'small', '4 Series': 'small', '5 Series': 'small', '8 Series': 'small', 'M3': 'small', 'M5': 'small', 'i4': 'small',
    'X1': 'suv', 'X3': 'suv', 'X5': 'suv', 'X6': 'suv', 'iX': 'suv',
    '7 Series': 'truck', 'X7': 'truck',
  },
  Buick: {
    'Encore': 'suv', 'Encore GX': 'suv', 'Envision': 'suv',
    'Enclave': 'truck',
  },
  Cadillac: {
    'CT4': 'small', 'CT5': 'small',
    'XT4': 'suv', 'XT5': 'suv', 'Lyriq': 'suv',
    'XT6': 'truck', 'Escalade': 'truck', 'Escalade ESV': 'truck',
  },
  Chevrolet: {
    'Spark': 'small', 'Malibu': 'small', 'Camaro': 'small', 'Corvette': 'small', 'Bolt EV': 'small', 'Trax': 'small',
    'Trailblazer': 'suv', 'Equinox': 'suv', 'Blazer': 'suv',
    'Traverse': 'truck', 'Tahoe': 'truck', 'Suburban': 'truck', 'Colorado': 'truck', 'Silverado 1500': 'truck', 'Silverado 2500': 'truck', 'Silverado 3500': 'truck',
  },
  Chrysler: {
    '300': 'small',
    'Pacifica': 'truck',
  },
  Dodge: {
    'Charger': 'small', 'Challenger': 'small', 'Hornet': 'small',
    'Durango': 'truck',
  },
  Ford: {
    'Mustang': 'small',
    'Escape': 'suv', 'Bronco Sport': 'suv', 'Bronco': 'suv', 'Edge': 'suv', 'Mustang Mach-E': 'suv',
    'Maverick': 'truck', 'Ranger': 'truck', 'F-150': 'truck', 'F-150 Lightning': 'truck', 'F-250': 'truck', 'F-350': 'truck', 'Explorer': 'truck', 'Expedition': 'truck', 'Expedition MAX': 'truck',
  },
  Genesis: {
    'G70': 'small', 'G80': 'small', 'G90': 'small',
    'GV60': 'suv', 'GV70': 'suv',
    'GV80': 'truck',
  },
  GMC: {
    'Terrain': 'suv',
    'Canyon': 'truck', 'Sierra 1500': 'truck', 'Sierra 2500': 'truck', 'Sierra 3500': 'truck', 'Acadia': 'truck', 'Yukon': 'truck', 'Yukon XL': 'truck', 'Hummer EV': 'truck',
  },
  Honda: {
    'Civic': 'small', 'Accord': 'small', 'Insight': 'small', 'HR-V': 'small',
    'CR-V': 'suv', 'Passport': 'suv', 'Prologue': 'suv',
    'Pilot': 'truck', 'Ridgeline': 'truck', 'Odyssey': 'truck',
  },
  Hyundai: {
    'Accent': 'small', 'Elantra': 'small', 'Sonata': 'small', 'Venue': 'small', 'Ioniq 6': 'small',
    'Kona': 'suv', 'Tucson': 'suv', 'Ioniq 5': 'suv',
    'Santa Fe': 'truck', 'Palisade': 'truck',
  },
  Infiniti: {
    'Q50': 'small', 'Q60': 'small',
    'QX50': 'suv', 'QX55': 'suv',
    'QX60': 'truck', 'QX80': 'truck',
  },
  Jeep: {
    'Renegade': 'small', 'Compass': 'small',
    'Cherokee': 'suv', 'Wrangler': 'suv',
    'Grand Cherokee': 'truck', 'Grand Cherokee L': 'truck', 'Gladiator': 'truck', 'Wagoneer': 'truck', 'Grand Wagoneer': 'truck',
  },
  Kia: {
    'Rio': 'small', 'Forte': 'small', 'K5': 'small', 'Stinger': 'small', 'Soul': 'small', 'Seltos': 'small',
    'Sportage': 'suv', 'EV6': 'suv',
    'Sorento': 'truck', 'Telluride': 'truck', 'Carnival': 'truck', 'EV9': 'truck',
  },
  'Land Rover': {
    'Range Rover Velar': 'suv', 'Range Rover Evoque': 'suv', 'Discovery Sport': 'suv', 'Defender': 'suv',
    'Range Rover': 'truck', 'Range Rover Sport': 'truck', 'Discovery': 'truck',
  },
  Lexus: {
    'IS': 'small', 'ES': 'small', 'LS': 'small', 'RC': 'small',
    'NX': 'suv', 'RZ': 'suv',
    'RX': 'truck', 'GX': 'truck', 'LX': 'truck',
  },
  Lincoln: {
    'Corsair': 'suv', 'Nautilus': 'suv',
    'Aviator': 'truck', 'Navigator': 'truck', 'Navigator L': 'truck',
  },
  Mazda: {
    'Mazda3': 'small', 'Mazda6': 'small', 'MX-5 Miata': 'small', 'CX-3': 'small', 'CX-30': 'small',
    'CX-5': 'suv', 'CX-50': 'suv',
    'CX-9': 'truck', 'CX-90': 'truck',
  },
  'Mercedes-Benz': {
    'A-Class': 'small', 'C-Class': 'small', 'E-Class': 'small', 'S-Class': 'small', 'CLA': 'small', 'CLS': 'small', 'EQS': 'small', 'EQE': 'small',
    'GLA': 'suv', 'GLB': 'suv', 'GLC': 'suv', 'GLE': 'suv',
    'GLS': 'truck', 'G-Class': 'truck',
  },
  Mini: {
    'Cooper': 'small', 'Clubman': 'small', 'Countryman': 'small',
  },
  Mitsubishi: {
    'Mirage': 'small', 'Eclipse Cross': 'small',
    'Outlander': 'suv', 'Outlander Sport': 'suv',
  },
  Nissan: {
    'Versa': 'small', 'Sentra': 'small', 'Altima': 'small', 'Maxima': 'small', 'Kicks': 'small', 'Leaf': 'small', 'Z': 'small',
    'Rogue': 'suv', 'Murano': 'suv', 'Ariya': 'suv',
    'Pathfinder': 'truck', 'Armada': 'truck', 'Frontier': 'truck', 'Titan': 'truck',
  },
  Porsche: {
    '718 Cayman': 'small', '911': 'small', 'Panamera': 'small', 'Taycan': 'small',
    'Macan': 'suv',
    'Cayenne': 'truck',
  },
  RAM: {
    '1500': 'truck', '2500': 'truck', '3500': 'truck', 'ProMaster': 'truck',
  },
  Subaru: {
    'Impreza': 'small', 'Legacy': 'small', 'WRX': 'small', 'Crosstrek': 'small', 'BRZ': 'small', 'Outback': 'small',
    'Forester': 'suv', 'Solterra': 'suv',
    'Ascent': 'truck',
  },
  Tesla: {
    'Model 3': 'small', 'Model S': 'small',
    'Model Y': 'suv', 'Model X': 'suv',
    'Cybertruck': 'truck',
  },
  Toyota: {
    'Corolla': 'small', 'Camry': 'small', 'Prius': 'small', 'GR86': 'small', 'Supra': 'small', 'Corolla Cross': 'small',
    'RAV4': 'suv', 'Venza': 'suv', 'bZ4X': 'suv',
    'Highlander': 'truck', '4Runner': 'truck', 'Sequoia': 'truck', 'Tacoma': 'truck', 'Tundra': 'truck', 'Sienna': 'truck', 'Land Cruiser': 'truck',
  },
  Volkswagen: {
    'Jetta': 'small', 'Passat': 'small', 'Arteon': 'small', 'GTI': 'small', 'Golf R': 'small', 'ID.4': 'small',
    'Taos': 'suv', 'Tiguan': 'suv',
    'Atlas': 'truck', 'Atlas Cross Sport': 'truck',
  },
  Volvo: {
    'S60': 'small', 'S90': 'small', 'V60': 'small', 'V90': 'small', 'EX30': 'small',
    'XC40': 'suv', 'XC60': 'suv',
    'XC90': 'truck',
  },
};

/**
 * Resolves the size category for a make + model. Returns null if
 * the make or model is not in the map (which should not happen
 * since AddVehicleForm only allows known makes and models).
 */
export function getVehicleSize(make: string, model: string): 'small' | 'suv' | 'truck' | null {
  const makeMap = VEHICLE_MODEL_SIZES[make];
  if (!makeMap) return null;
  return makeMap[model] ?? null;
}

/**
 * Sorted alphabetical list of makes for dropdown rendering.
 * Derived from VEHICLE_MAKES so the data source stays single-truth.
 */
export const ALL_MAKES = Object.keys(VEHICLE_MAKES).sort();

/**
 * Year range for the year dropdown. Newest first so current year
 * appears at the top of the menu.
 */
export const VEHICLE_YEARS: number[] = (() => {
  const currentYear = new Date().getFullYear();
  const startYear = 2000;
  const years: number[] = [];
  for (let y = currentYear + 1; y >= startYear; y--) {
    years.push(y);
  }
  return years;
})();

/**
 * Sentinel value for the "Other / Not Listed" option in the make
 * dropdown. When selected, the UI swaps to freeform make + model
 * inputs so customers with unlisted vehicles can still register.
 */
export const OTHER_MAKE_VALUE = '__other__';
