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
  Acura: ['TLX', 'TL', 'TSX', 'RL', 'RLX', 'MDX', 'RDX', 'ILX', 'ZDX', 'Integra', 'NSX'],
  'Alfa Romeo': ['4C', 'Giulia', 'Stelvio', 'Tonale'],
  Audi: ['A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'Q3', 'Q5', 'SQ5', 'Q7', 'SQ7', 'Q8', 'SQ8', 'e-tron', 'e-tron GT', 'RS5', 'RS7', 'TT', 'R8'],
  BMW: ['1 Series', '2 Series', '3 Series', '4 Series', '5 Series', '6 Series', '7 Series', '8 Series', 'X1', 'X3', 'X4', 'X5', 'X6', 'X7', 'M3', 'M5', 'i3', 'i4', 'i7', 'i8', 'iX', 'Z4'],
  Buick: ['Encore', 'Encore GX', 'Envision', 'Enclave'],
  Cadillac: ['ATS', 'CTS', 'STS', 'DTS', 'CT4', 'CT5', 'CT6', 'SRX', 'XT4', 'XT5', 'XT6', 'Escalade', 'Escalade ESV', 'Lyriq'],
  Chevrolet: ['Sonic', 'Spark', 'Cruze', 'Malibu', 'Impala', 'Camaro', 'Corvette', 'Trax', 'Trailblazer', 'Equinox', 'Blazer', 'Traverse', 'Tahoe', 'Suburban', 'Colorado', 'Silverado 1500', 'Silverado 2500', 'Silverado 3500', 'Silverado EV', 'Express Van', 'Bolt EV'],
  Chrysler: ['300', 'Pacifica'],
  Dodge: ['Charger', 'Challenger', 'Magnum', 'Hornet', 'Journey', 'Durango', 'Caravan', 'Grand Caravan', 'Ram 1500', 'Ram 2500', 'Ram 3500'],
  Ford: ['Fiesta', 'Focus', 'Fusion', 'Taurus', 'Mustang', 'C-Max', 'Transit Connect', 'Maverick', 'Ranger', 'F-150', 'F-150 Lightning', 'F-250', 'F-350', 'Transit', 'Escape', 'Bronco Sport', 'Bronco', 'Edge', 'Flex', 'Explorer', 'Expedition', 'Expedition MAX', 'Mustang Mach-E'],
  Genesis: ['G70', 'G80', 'G90', 'GV60', 'GV70', 'GV80'],
  GMC: ['Canyon', 'Sierra 1500', 'Sierra 2500', 'Sierra 3500', 'Terrain', 'Acadia', 'Yukon', 'Yukon XL', 'Hummer EV'],
  Honda: ['Fit', 'CR-Z', 'Civic', 'Accord', 'Insight', 'HR-V', 'Element', 'CR-V', 'Passport', 'Pilot', 'Ridgeline', 'Odyssey', 'Prologue'],
  Hummer: ['H1', 'H2', 'H3'],
  Hyundai: ['Accent', 'Elantra', 'Veloster', 'Genesis Coupe', 'Sonata', 'Venue', 'Kona', 'Tucson', 'Santa Fe', 'Palisade', 'Ioniq 5', 'Ioniq 6'],
  Infiniti: ['Q50', 'Q60', 'QX50', 'QX55', 'QX60', 'QX80'],
  Jeep: ['Compass', 'Cherokee', 'Grand Cherokee', 'Grand Cherokee L', 'Wrangler', 'Gladiator', 'Wagoneer', 'Grand Wagoneer', 'Renegade'],
  Kia: ['Rio', 'Forte', 'K5', 'Stinger', 'Soul', 'Seltos', 'Sportage', 'Sorento', 'Telluride', 'Carnival', 'EV6', 'EV9'],
  'Land Rover': ['Range Rover', 'Range Rover Sport', 'Range Rover Velar', 'Range Rover Evoque', 'Discovery', 'Discovery Sport', 'Defender'],
  Lexus: ['CT', 'HS', 'IS', 'IS C', 'ES', 'LS', 'SC', 'RC', 'NX', 'RZ', 'RX', 'GX', 'LX'],
  Lincoln: ['MKZ', 'Continental', 'Town Car', 'MKC', 'Corsair', 'MKX', 'Nautilus', 'MKT', 'Aviator', 'Navigator', 'Navigator L'],
  Lucid: ['Air', 'Gravity'],
  Maserati: ['Ghibli', 'Quattroporte', 'MC20', 'Grecale', 'Levante'],
  Mazda: ['Mazda3', 'Mazda6', 'RX-8', 'MX-5 Miata', 'CX-3', 'CX-30', 'CX-5', 'CX-50', 'CX-7', 'Tribute', 'CX-9', 'CX-90'],
  'Mercedes-Benz': ['A-Class', 'C-Class', 'E-Class', 'S-Class', 'CLA', 'CLS', 'SL', 'SLC', 'SLK', 'AMG GT', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'GL-Class', 'ML-Class', 'G-Class', 'R-Class', 'EQS', 'EQE'],
  Mercury: ['Grand Marquis', 'Marauder', 'Milan', 'Mariner', 'Mountaineer'],
  Mini: ['Cooper', 'Clubman', 'Countryman'],
  Mitsubishi: ['Outlander', 'Outlander Sport', 'Eclipse Cross', 'Mirage'],
  Nissan: ['Versa', 'Cube', 'Sentra', 'Altima', 'Maxima', '370Z', 'GT-R', 'Z', 'NV200', 'Kicks', 'Juke', 'Rogue', 'Murano', 'Xterra', 'Pathfinder', 'Armada', 'Frontier', 'Titan', 'Leaf', 'Ariya'],
  Polestar: ['2', '3', '4'],
  Pontiac: ['G3', 'G6', 'G8', 'GTO', 'Solstice', 'Vibe', 'Aztek', 'Torrent'],
  Porsche: ['718 Cayman', '911', 'Panamera', 'Macan', 'Cayenne', 'Taycan'],
  RAM: ['1500', '2500', '3500', 'ProMaster'],
  Rivian: ['R1S', 'R1T'],
  Saab: ['9-3', '9-5', '9-7X'],
  Saturn: ['Aura', 'Ion', 'Sky', 'Vue', 'Outlook'],
  Scion: ['FR-S', 'iA', 'iM', 'iQ', 'tC', 'xB'],
  Subaru: ['Impreza', 'Legacy', 'WRX', 'STI', 'BRZ', 'Crosstrek', 'Outback', 'Forester', 'Solterra', 'Baja', 'Tribeca', 'Ascent'],
  Suzuki: ['Grand Vitara', 'Kizashi', 'SX4'],
  Tesla: ['Roadster', 'Model 3', 'Model S', 'Model X', 'Model Y', 'Cybertruck'],
  Toyota: ['Yaris', 'Corolla', 'Matrix', 'Camry', 'Avalon', 'Prius', 'GR86', 'Supra', 'C-HR', 'Corolla Cross', 'RAV4', 'Venza', 'FJ Cruiser', 'Highlander', '4Runner', 'Sequoia', 'Tacoma', 'Tundra', 'Sienna', 'bZ4X', 'Land Cruiser'],
  Volkswagen: ['Beetle', 'Golf', 'GTI', 'Golf R', 'Jetta', 'Passat', 'CC', 'Eos', 'Arteon', 'Taos', 'Tiguan', 'Touareg', 'Atlas', 'Atlas Cross Sport', 'ID.4', 'Routan'],
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
    'TLX': 'small', 'TL': 'small', 'TSX': 'small', 'RL': 'small', 'RLX': 'small', 'ILX': 'small', 'Integra': 'small', 'NSX': 'small',
    'RDX': 'suv', 'ZDX': 'suv',
    'MDX': 'truck',
  },
  'Alfa Romeo': {
    '4C': 'small', 'Giulia': 'small',
    'Stelvio': 'suv', 'Tonale': 'suv',
  },
  Audi: {
    'A3': 'small', 'A4': 'small', 'A5': 'small', 'A6': 'small', 'A7': 'small', 'A8': 'small', 'RS5': 'small', 'RS7': 'small', 'TT': 'small', 'R8': 'small', 'S3': 'small', 'S4': 'small', 'S5': 'small', 'S6': 'small', 'S7': 'small', 'S8': 'small', 'e-tron GT': 'small',
    'Q3': 'suv', 'Q5': 'suv', 'e-tron': 'suv', 'SQ5': 'suv',
    'Q7': 'truck', 'Q8': 'truck', 'SQ7': 'truck', 'SQ8': 'truck',
  },
  BMW: {
    '1 Series': 'small', '2 Series': 'small', '3 Series': 'small', '4 Series': 'small', '5 Series': 'small', '6 Series': 'small', '8 Series': 'small', 'M3': 'small', 'M5': 'small', 'i3': 'small', 'i4': 'small', 'i8': 'small', 'Z4': 'small',
    'X1': 'suv', 'X3': 'suv', 'X4': 'suv', 'X5': 'suv', 'X6': 'suv', 'iX': 'suv',
    '7 Series': 'truck', 'X7': 'truck', 'i7': 'truck',
  },
  Buick: {
    'Encore': 'suv', 'Encore GX': 'suv', 'Envision': 'suv',
    'Enclave': 'truck',
  },
  Cadillac: {
    'CT4': 'small', 'CT5': 'small', 'ATS': 'small', 'CTS': 'small', 'STS': 'small', 'DTS': 'small', 'CT6': 'small',
    'XT4': 'suv', 'XT5': 'suv', 'Lyriq': 'suv', 'SRX': 'suv',
    'XT6': 'truck', 'Escalade': 'truck', 'Escalade ESV': 'truck',
  },
  Chevrolet: {
    'Spark': 'small', 'Malibu': 'small', 'Camaro': 'small', 'Corvette': 'small', 'Bolt EV': 'small', 'Trax': 'small', 'Cruze': 'small', 'Impala': 'small', 'Sonic': 'small',
    'Trailblazer': 'suv', 'Equinox': 'suv', 'Blazer': 'suv',
    'Traverse': 'truck', 'Tahoe': 'truck', 'Suburban': 'truck', 'Colorado': 'truck', 'Silverado 1500': 'truck', 'Silverado 2500': 'truck', 'Silverado 3500': 'truck', 'Silverado EV': 'truck', 'Express Van': 'truck',
  },
  Chrysler: {
    '300': 'small',
    'Pacifica': 'truck',
  },
  Dodge: {
    'Charger': 'small', 'Challenger': 'small', 'Hornet': 'small', 'Magnum': 'small',
    'Journey': 'suv',
    'Durango': 'truck', 'Caravan': 'truck', 'Grand Caravan': 'truck', 'Ram 1500': 'truck', 'Ram 2500': 'truck', 'Ram 3500': 'truck',
  },
  Ford: {
    'Mustang': 'small', 'Fiesta': 'small', 'Focus': 'small', 'Fusion': 'small', 'Taurus': 'small', 'C-Max': 'small', 'Transit Connect': 'small',
    'Escape': 'suv', 'Bronco Sport': 'suv', 'Bronco': 'suv', 'Edge': 'suv', 'Mustang Mach-E': 'suv',
    'Maverick': 'truck', 'Ranger': 'truck', 'F-150': 'truck', 'F-150 Lightning': 'truck', 'F-250': 'truck', 'F-350': 'truck', 'Explorer': 'truck', 'Expedition': 'truck', 'Expedition MAX': 'truck', 'Flex': 'truck', 'Transit': 'truck',
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
    'Civic': 'small', 'Accord': 'small', 'Insight': 'small', 'HR-V': 'small', 'Fit': 'small', 'CR-Z': 'small',
    'CR-V': 'suv', 'Passport': 'suv', 'Prologue': 'suv', 'Element': 'suv',
    'Pilot': 'truck', 'Ridgeline': 'truck', 'Odyssey': 'truck',
  },
  Hummer: {
    'H3': 'suv',
    'H1': 'truck', 'H2': 'truck',
  },
  Hyundai: {
    'Accent': 'small', 'Elantra': 'small', 'Sonata': 'small', 'Venue': 'small', 'Ioniq 6': 'small', 'Veloster': 'small', 'Genesis Coupe': 'small',
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
    'IS': 'small', 'ES': 'small', 'LS': 'small', 'RC': 'small', 'SC': 'small', 'HS': 'small', 'CT': 'small', 'IS C': 'small',
    'NX': 'suv', 'RZ': 'suv',
    'RX': 'truck', 'GX': 'truck', 'LX': 'truck',
  },
  Lincoln: {
    'MKZ': 'small', 'Continental': 'small', 'Town Car': 'small',
    'Corsair': 'suv', 'Nautilus': 'suv', 'MKC': 'suv', 'MKX': 'suv',
    'Aviator': 'truck', 'Navigator': 'truck', 'Navigator L': 'truck', 'MKT': 'truck',
  },
  Lucid: {
    'Air': 'small',
    'Gravity': 'suv',
  },
  Maserati: {
    'Ghibli': 'small', 'Quattroporte': 'small', 'MC20': 'small',
    'Levante': 'suv', 'Grecale': 'suv',
  },
  Mazda: {
    'Mazda3': 'small', 'Mazda6': 'small', 'MX-5 Miata': 'small', 'CX-3': 'small', 'CX-30': 'small', 'RX-8': 'small',
    'CX-5': 'suv', 'CX-50': 'suv', 'CX-7': 'suv', 'Tribute': 'suv',
    'CX-9': 'truck', 'CX-90': 'truck',
  },
  'Mercedes-Benz': {
    'A-Class': 'small', 'C-Class': 'small', 'E-Class': 'small', 'S-Class': 'small', 'CLA': 'small', 'CLS': 'small', 'EQS': 'small', 'EQE': 'small', 'SLK': 'small', 'SLC': 'small', 'SL': 'small', 'AMG GT': 'small',
    'GLA': 'suv', 'GLB': 'suv', 'GLC': 'suv', 'GLE': 'suv', 'ML-Class': 'suv',
    'GLS': 'truck', 'G-Class': 'truck', 'R-Class': 'truck', 'GL-Class': 'truck',
  },
  Mercury: {
    'Milan': 'small', 'Marauder': 'small', 'Grand Marquis': 'small',
    'Mariner': 'suv', 'Mountaineer': 'suv',
  },
  Mini: {
    'Cooper': 'small', 'Clubman': 'small', 'Countryman': 'small',
  },
  Mitsubishi: {
    'Mirage': 'small', 'Eclipse Cross': 'small',
    'Outlander': 'suv', 'Outlander Sport': 'suv',
  },
  Nissan: {
    'Versa': 'small', 'Sentra': 'small', 'Altima': 'small', 'Maxima': 'small', 'Kicks': 'small', 'Leaf': 'small', 'Z': 'small', '370Z': 'small', 'GT-R': 'small', 'Cube': 'small', 'Juke': 'small', 'NV200': 'small',
    'Rogue': 'suv', 'Murano': 'suv', 'Ariya': 'suv', 'Xterra': 'suv',
    'Pathfinder': 'truck', 'Armada': 'truck', 'Frontier': 'truck', 'Titan': 'truck',
  },
  Polestar: {
    '2': 'small',
    '3': 'suv', '4': 'suv',
  },
  Pontiac: {
    'G3': 'small', 'G6': 'small', 'G8': 'small', 'GTO': 'small', 'Solstice': 'small', 'Vibe': 'small',
    'Aztek': 'suv', 'Torrent': 'suv',
  },
  Porsche: {
    '718 Cayman': 'small', '911': 'small', 'Panamera': 'small', 'Taycan': 'small',
    'Macan': 'suv',
    'Cayenne': 'truck',
  },
  RAM: {
    '1500': 'truck', '2500': 'truck', '3500': 'truck', 'ProMaster': 'truck',
  },
  Rivian: {
    'R1T': 'truck', 'R1S': 'truck',
  },
  Saab: {
    '9-3': 'small', '9-5': 'small',
    '9-7X': 'suv',
  },
  Saturn: {
    'Aura': 'small', 'Ion': 'small', 'Sky': 'small',
    'Vue': 'suv',
    'Outlook': 'truck',
  },
  Scion: {
    'xB': 'small', 'tC': 'small', 'iQ': 'small', 'FR-S': 'small', 'iA': 'small', 'iM': 'small',
  },
  Subaru: {
    'Impreza': 'small', 'Legacy': 'small', 'WRX': 'small', 'Crosstrek': 'small', 'BRZ': 'small', 'Outback': 'small', 'STI': 'small',
    'Forester': 'suv', 'Solterra': 'suv',
    'Ascent': 'truck', 'Tribeca': 'truck', 'Baja': 'truck',
  },
  Suzuki: {
    'SX4': 'small', 'Kizashi': 'small',
    'Grand Vitara': 'suv',
  },
  Tesla: {
    'Roadster': 'small', 'Model 3': 'small', 'Model S': 'small',
    'Model Y': 'suv', 'Model X': 'suv',
    'Cybertruck': 'truck',
  },
  Toyota: {
    'Corolla': 'small', 'Camry': 'small', 'Prius': 'small', 'GR86': 'small', 'Supra': 'small', 'Corolla Cross': 'small', 'Avalon': 'small', 'Yaris': 'small', 'C-HR': 'small', 'Matrix': 'small',
    'RAV4': 'suv', 'Venza': 'suv', 'bZ4X': 'suv', 'FJ Cruiser': 'suv',
    'Highlander': 'truck', '4Runner': 'truck', 'Sequoia': 'truck', 'Tacoma': 'truck', 'Tundra': 'truck', 'Sienna': 'truck', 'Land Cruiser': 'truck',
  },
  Volkswagen: {
    'Jetta': 'small', 'Passat': 'small', 'Arteon': 'small', 'GTI': 'small', 'Golf R': 'small', 'ID.4': 'small', 'Beetle': 'small', 'Golf': 'small', 'Eos': 'small', 'CC': 'small',
    'Taos': 'suv', 'Tiguan': 'suv', 'Touareg': 'suv',
    'Atlas': 'truck', 'Atlas Cross Sport': 'truck', 'Routan': 'truck',
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
