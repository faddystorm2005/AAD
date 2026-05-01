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
