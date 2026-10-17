// HVAC materials catalog for Field Orders: what the crews order, with the questions that pin the exact item.
// Each category: id, name, kw (words that point to it in a request), clarify (questions the AI must settle before the
// order goes out), items (name, sizes/options, unit, pack). Images: items may carry img (URL) — none yet.
// Loaded by field-orders.html; also readable by the AI helper prompt (compact text via NWHVACCatalog.text()).
(function () {
  var C = [
    { id: 'copper', name: 'Copper pipe & tube', kw: ['copper', 'cu ', 'acr', 'type l', 'type k', 'type m', 'refrigerant line', 'lineset', 'line set', 'soft copper', 'hard copper'],
      clarify: ['Which copper: Type L or K (hydronic / domestic water, nominal sizes) or ACR refrigeration tube (OD sizes)?', 'Hard-drawn straight lengths (20 ft sticks) or soft annealed coils (50 ft)?', 'Exact size (nominal for L/K/M, outside diameter for ACR)?', 'Total length needed, and is insulation needed with it?'],
      items: [
        { name: 'Copper pipe Type L, hard (hydronic / domestic water)', sizes: ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"', '2-1/2"', '3"', '4"'], unit: 'ft', pack: '20 ft sticks' },
        { name: 'Copper pipe Type K, hard (heavy wall, underground / condenser water)', sizes: ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"', '2-1/2"', '3"', '4"'], unit: 'ft', pack: '20 ft sticks' },
        { name: 'Copper pipe Type M, hard (light wall, condensate / low pressure)', sizes: ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"'], unit: 'ft', pack: '20 ft sticks' },
        { name: 'Copper tube Type L, soft coil', sizes: ['1/4"', '3/8"', '1/2"', '5/8"', '3/4"', '1"'], unit: 'ft', pack: '60 / 100 ft coils' },
        { name: 'ACR copper tube, hard (refrigeration, OD sizes, nitrogen-charged)', sizes: ['1/4"', '3/8"', '1/2"', '5/8"', '3/4"', '7/8"', '1-1/8"', '1-3/8"', '1-5/8"', '2-1/8"'], unit: 'ft', pack: '20 ft sticks' },
        { name: 'ACR copper tube, soft coil (refrigeration, OD sizes)', sizes: ['1/4"', '3/8"', '1/2"', '5/8"', '3/4"', '7/8"', '1-1/8"'], unit: 'ft', pack: '50 ft coils' },
        { name: 'Line set, pre-insulated (liquid + suction, 1/2" wall)', sizes: ['1/4" x 1/2"', '1/4" x 5/8"', '3/8" x 3/4"', '3/8" x 7/8"', '1/2" x 1-1/8"'], unit: 'set', pack: '25 / 50 ft' }
      ] },
    { id: 'copper_fittings', name: 'Copper & press fittings', kw: ['elbow', 'ell', 'tee', 'coupling', 'reducer', 'adapter', 'cap', 'sweat', 'solder fitting', 'press fitting', 'propress', 'union', 'street'],
      clarify: ['Sweat (solder/braze), press (ProPress) or ACR refrigeration fitting?', 'Size — and for reducers both sizes (e.g. 1" x 3/4")?', 'Copper x copper, or an adapter (male/female thread)?', 'Quantity of each?'],
      items: [
        { name: '90° elbow, copper sweat', sizes: ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"', '2-1/2"', '3"', '4"'], unit: 'ea', opts: ['C x C', 'street (FTG x C)', 'long radius'] },
        { name: '45° elbow, copper sweat', sizes: ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"', '2-1/2"', '3"'], unit: 'ea' },
        { name: 'Tee, copper sweat', sizes: ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"', '2-1/2"', '3"'], unit: 'ea', opts: ['straight', 'reducing (give run x run x branch)'] },
        { name: 'Coupling, copper sweat', sizes: ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"', '2-1/2"', '3"', '4"'], unit: 'ea', opts: ['with stop', 'slip (no stop)', 'reducing'] },
        { name: 'Cap, copper sweat', sizes: ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"'], unit: 'ea' },
        { name: 'Adapter, copper sweat x thread', sizes: ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"'], unit: 'ea', opts: ['male (C x MIP)', 'female (C x FIP)'] },
        { name: 'Union, copper sweat', sizes: ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"'], unit: 'ea' },
        { name: 'Dielectric union', sizes: ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"'], unit: 'ea' },
        { name: 'ProPress fitting (copper press)', sizes: ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"', '2-1/2"', '3"', '4"'], unit: 'ea', opts: ['90° elbow', '45° elbow', 'tee', 'coupling', 'cap', 'adapter MIP/FIP', 'union', 'ball valve'] },
        { name: 'ACR refrigeration fitting (OD sizes)', sizes: ['1/4"', '3/8"', '1/2"', '5/8"', '3/4"', '7/8"', '1-1/8"', '1-3/8"'], unit: 'ea', opts: ['90° elbow', '45° elbow', 'tee', 'coupling', 'reducing coupling', 'cap'] }
      ] },
    { id: 'steel_pipe', name: 'Steel / black iron pipe & fittings', kw: ['black iron', 'black pipe', 'steel pipe', 'threaded', 'galvanized pipe', 'gas pipe', 'schedule 40', 'sch 40', 'nipple', 'malleable', 'grooved', 'victaulic', 'weld'],
      clarify: ['Black (gas / hydronic) or galvanized?', 'Threaded, welded or grooved (Victaulic)?', 'Size and total length — 21 ft lengths, or pre-cut nipples (give lengths)?', 'Fittings: class 150 malleable, forged, or grooved couplings?'],
      items: [
        { name: 'Black iron pipe, Sch 40, threaded & coupled', sizes: ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"', '2-1/2"', '3"', '4"'], unit: 'ft', pack: '21 ft lengths' },
        { name: 'Galvanized pipe, Sch 40, threaded & coupled', sizes: ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"'], unit: 'ft', pack: '21 ft lengths' },
        { name: 'Black iron nipple', sizes: ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"'], unit: 'ea', opts: ['close', '2"', '3"', '4"', '6"', '8"', '12"'] },
        { name: 'Malleable iron fitting, black, class 150', sizes: ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"', '2-1/2"', '3"'], unit: 'ea', opts: ['90° elbow', '45° elbow', 'tee', 'coupling', 'union', 'cap', 'plug', 'bushing', 'reducing coupling', 'street elbow'] },
        { name: 'Malleable iron fitting, galvanized, class 150', sizes: ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"'], unit: 'ea', opts: ['90° elbow', '45° elbow', 'tee', 'coupling', 'union', 'cap', 'plug'] },
        { name: 'Grooved coupling / fitting (Victaulic style)', sizes: ['2"', '2-1/2"', '3"', '4"', '6"'], unit: 'ea', opts: ['rigid coupling', 'flexible coupling', '90° elbow', 'tee', 'reducer', 'flange adapter'] },
        { name: 'Flange, weld neck / slip-on, 150#', sizes: ['2"', '2-1/2"', '3"', '4"', '6"'], unit: 'ea' },
        { name: 'Drip leg / gas sediment trap kit', sizes: ['1/2"', '3/4"', '1"'], unit: 'ea' }
      ] },
    { id: 'plastic_pipe', name: 'PVC / CPVC / PEX & condensate', kw: ['pvc', 'cpvc', 'pex', 'condensate', 'drain line', 'trap', 'condensate pump', 'p-trap', 'dwv'],
      clarify: ['PVC Sch 40 (DWV / condensate) or CPVC (hot water) or PEX?', 'Size, total length, and which fittings (give quantity of each)?', 'Glue / primer / cleaner needed with it?', 'Condensate pump: lift height and voltage (115 / 230 V)?'],
      items: [
        { name: 'PVC pipe Sch 40', sizes: ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"', '3"', '4"'], unit: 'ft', pack: '10 / 20 ft lengths' },
        { name: 'PVC fitting Sch 40', sizes: ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"', '3"', '4"'], unit: 'ea', opts: ['90° elbow', '45° elbow', 'tee', 'coupling', 'cap', 'male adapter', 'female adapter', 'P-trap', 'union', 'ball valve', 'cleanout'] },
        { name: 'PVC cement + primer', sizes: ['pint', 'quart'], unit: 'ea', opts: ['regular clear', 'medium gray', 'purple primer', 'cleaner'] },
        { name: 'CPVC pipe & fittings', sizes: ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"'], unit: 'ft', opts: ['pipe', '90° elbow', 'tee', 'coupling', 'adapter'] },
        { name: 'PEX tubing', sizes: ['1/2"', '3/4"', '1"'], unit: 'ft', opts: ['PEX-A (expansion)', 'PEX-B (crimp)', 'oxygen barrier (hydronic)'], pack: '100 / 300 ft coils' },
        { name: 'Condensate pump', sizes: ['115 V', '230 V'], unit: 'ea', opts: ['mini-split (in-line, e.g. Aspen / Sauermann)', 'tank type (Little Giant / Diversitech, 20 ft lift)', 'with safety switch'] },
        { name: 'Condensate trap / float switch', sizes: ['3/4"', '1"'], unit: 'ea', opts: ['EZ trap', 'float switch (SS1 / SS2)', 'clear P-trap'] },
        { name: 'Condensate drain hose, clear braided', sizes: ['5/8"', '3/4"'], unit: 'ft' }
      ] },
    { id: 'valves', name: 'Valves & specialties', kw: ['valve', 'ball valve', 'gate', 'check valve', 'strainer', 'balancing', 'circuit setter', 'air vent', 'prv', 'relief', 'expansion tank', 'thermometer', 'gauge', 'pete', 'flex connector', 'hose kit'],
      clarify: ['Valve type (ball, gate, globe, check, balancing, PRV, relief) and size?', 'End connection: sweat, threaded (NPT), press, flanged or grooved?', 'Service: chilled / hot water, refrigerant, gas (CSA listed), domestic water (lead-free)?', 'Pressure rating and quantity?'],
      items: [
        { name: 'Ball valve, full port', sizes: ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"', '2-1/2"', '3"'], unit: 'ea', opts: ['sweat', 'threaded', 'press', 'with drain', 'gas (CSA)', 'lead-free (domestic)'] },
        { name: 'Butterfly valve, lug / wafer', sizes: ['2-1/2"', '3"', '4"', '6"'], unit: 'ea', opts: ['lever', 'gear operator'] },
        { name: 'Check valve', sizes: ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"', '3"'], unit: 'ea', opts: ['swing', 'spring (silent)', 'sweat', 'threaded'] },
        { name: 'Y-strainer', sizes: ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"', '3"'], unit: 'ea', opts: ['sweat', 'threaded', 'flanged'] },
        { name: 'Balancing valve / circuit setter', sizes: ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"'], unit: 'ea', opts: ['sweat', 'threaded', 'with P/T ports'] },
        { name: 'Pressure reducing / fill valve', sizes: ['1/2"', '3/4"', '1"'], unit: 'ea', opts: ['with backflow preventer'] },
        { name: 'Relief valve (boiler / water heater)', sizes: ['3/4"', '1"'], unit: 'ea', opts: ['30 psi', '50 psi', '150 psi (T&P)'] },
        { name: 'Automatic air vent / air separator', sizes: ['1/8"', '1/4"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"'], unit: 'ea', opts: ['float vent', 'air separator', 'manual coin vent'] },
        { name: 'Expansion tank', sizes: ['2 gal', '4.4 gal', '8 gal', '14 gal', '20 gal'], unit: 'ea', opts: ['hydronic', 'potable (thermal)'] },
        { name: 'Pete\'s plug / P-T port', sizes: ['1/4"', '1/2"'], unit: 'ea' },
        { name: 'Thermometer / pressure gauge', sizes: ['0-100 psi', '0-200 psi', '30-240 °F'], unit: 'ea', opts: ['with well', 'with snubber / gauge cock'] },
        { name: 'Flexible connector (braided stainless)', sizes: ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"', '2-1/2"', '3"'], unit: 'ea', opts: ['sweat', 'threaded', 'flanged', 'length (12" / 18" / 24")'] },
        { name: 'Hose kit (coil / fan coil / VAV reheat)', sizes: ['1/2"', '3/4"', '1"'], unit: 'kit', opts: ['with ball valves', 'with strainer', 'with balancing valve'] },
        { name: 'Solenoid / zone valve', sizes: ['1/2"', '3/4"', '1"'], unit: 'ea', opts: ['24 V', '120 V', 'normally closed', '2-way', '3-way'] }
      ] },
    { id: 'refrigerant', name: 'Refrigerant, gases & brazing', kw: ['refrigerant', 'r410', 'r-410', 'r32', 'r-32', 'r454', 'r-454', 'r22', 'nitrogen', 'oxygen', 'acetylene', 'brazing', 'sil-fos', 'silfos', 'solder', 'flux', 'map gas', 'mapp', 'vacuum pump oil', 'filter drier', 'sight glass', 'txv'],
      clarify: ['Refrigerant type (R-410A, R-32, R-454B, R-22, R-134a) and cylinder size (25 lb / 50 lb)?', 'Brazing: Sil-Fos 15% (copper-copper), 5%, or silver solder with flux (copper-brass)? Quantity of sticks?', 'Nitrogen: cylinder size (40 / 80 / 125 cu ft), regulator needed?', 'Filter drier: liquid line size and flare / sweat?'],
      items: [
        { name: 'Refrigerant cylinder', sizes: ['R-410A 25 lb', 'R-32 (cylinder)', 'R-454B (cylinder)', 'R-22 30 lb (reclaim / existing)', 'R-134a 30 lb', 'R-407C 25 lb'], unit: 'ea' },
        { name: 'Nitrogen cylinder', sizes: ['40 cu ft', '80 cu ft', '125 cu ft', '250 cu ft'], unit: 'ea', opts: ['with regulator', 'exchange'] },
        { name: 'Oxygen / acetylene cylinder', sizes: ['MC acetylene', 'B acetylene', 'R oxygen', '20 cu ft oxygen'], unit: 'ea' },
        { name: 'Brazing rod Sil-Fos 15% (copper to copper)', sizes: ['1 lb (28 sticks)', '5 lb'], unit: 'lb' },
        { name: 'Brazing rod 5% silver / 0% (Phos-copper)', sizes: ['1 lb'], unit: 'lb' },
        { name: 'Silver solder 45% / 56% + white flux (copper to brass / steel)', sizes: ['1 oz', '5 oz'], unit: 'ea' },
        { name: 'Solder & flux (lead-free, 95/5 or Silvabrite)', sizes: ['1 lb spool'], unit: 'ea', opts: ['with paste flux', 'water soluble flux'] },
        { name: 'MAPP / propane torch cylinder', sizes: ['14 oz MAPP', '16 oz propane'], unit: 'ea', opts: ['torch head'] },
        { name: 'Filter drier, liquid line', sizes: ['1/4"', '3/8"', '1/2"', '5/8"', '7/8"'], unit: 'ea', opts: ['sweat', 'flare', 'bi-flow (heat pump)', 'suction line'] },
        { name: 'Sight glass / moisture indicator', sizes: ['3/8"', '1/2"', '5/8"', '7/8"'], unit: 'ea', opts: ['sweat', 'flare'] },
        { name: 'Schrader / access valve, caps, cores', sizes: ['1/4" SAE', '5/16" (R-410A)'], unit: 'ea', opts: ['tee', 'saddle valve', 'core removal tool'] },
        { name: 'Vacuum pump oil', sizes: ['quart', 'gallon'], unit: 'ea' },
        { name: 'Refrigerant oil', sizes: ['POE 32', 'POE 68', 'mineral 3GS'], unit: 'qt' },
        { name: 'Leak detector / dye / Nylog', sizes: ['Nylog Blue', 'UV dye', 'Big Blu bubbles'], unit: 'ea' }
      ] },
    { id: 'duct', name: 'Sheet metal duct & fittings', kw: ['duct', 'ductwork', 'sheet metal', 'spiral', 'rectangular', 'round duct', 'snap lock', 'elbow duct', 'takeoff', 'collar', 'reducer duct', 'plenum', 'boot', 'end cap', 'gauge', 'tdc', 'slip', 'drive', 's-cleat', 'transition', 'volume damper', 'fire damper', 'smoke damper', 'access door'],
      clarify: ['Rectangular (give W x H, gauge, joint type: slip & drive or TDC/TDF) or round (snap-lock or spiral, diameter, gauge)?', 'Fitting type: elbow (radius / square with vanes), reducer / transition, tee, takeoff (straight / 45° / saddle / spin-in), collar, boot, end cap, offset?', 'Galvanized, aluminum, stainless, or PVC-coated? Lined (1" liner) or bare?', 'Lengths and quantity; pressure class (2" / 4" / 6" w.g.) if a main?'],
      items: [
        { name: 'Rectangular duct, galvanized (W x H, 4 ft / 5 ft joints)', sizes: ['26 ga', '24 ga', '22 ga', '20 ga'], unit: 'ft', opts: ['slip & drive', 'TDC / TDF', 'lined 1"', 'unlined'] },
        { name: 'Rectangular fitting (elbow / transition / offset / tee / reducer)', sizes: ['give W x H'], unit: 'ea', opts: ['radius elbow', 'square elbow with turning vanes', 'transition (give both sizes)', 'offset', 'tee / wye', 'end cap', 'access door'] },
        { name: 'Round snap-lock pipe, galvanized', sizes: ['4"', '5"', '6"', '7"', '8"', '9"', '10"', '12"', '14"'], unit: 'ft', pack: '5 ft joints', opts: ['30 ga', '28 ga', '26 ga'] },
        { name: 'Spiral duct, galvanized', sizes: ['6"', '8"', '10"', '12"', '14"', '16"', '18"', '20"', '24"', '30"', '36"'], unit: 'ft', pack: '10 ft lengths', opts: ['26 ga', '24 ga', '22 ga', 'double wall insulated'] },
        { name: 'Round fitting (90° / 45° elbow, adjustable)', sizes: ['4"', '5"', '6"', '7"', '8"', '10"', '12"', '14"'], unit: 'ea', opts: ['adjustable elbow', 'fixed radius (spiral)', 'gored'] },
        { name: 'Round reducer / increaser', sizes: ['6x4', '7x6', '8x6', '10x8', '12x10', '14x12', 'other (give sizes)'], unit: 'ea' },
        { name: 'Takeoff / collar', sizes: ['4"', '5"', '6"', '7"', '8"', '10"', '12"', '14"'], unit: 'ea', opts: ['straight takeoff', '45° takeoff', 'saddle tap', 'spin-in with damper', 'start collar', 'conical'] },
        { name: 'Round tee / wye / cross', sizes: ['6"', '8"', '10"', '12"', '14"'], unit: 'ea', opts: ['tee', 'wye 45°', 'cross', 'reducing (give sizes)'] },
        { name: 'Round end cap / tap-in / boot', sizes: ['4"', '5"', '6"', '7"', '8"', '10"', '12"'], unit: 'ea', opts: ['end cap', 'ceiling box / boot (give register size)', 'plenum'] },
        { name: 'Volume damper (manual)', sizes: ['4"', '5"', '6"', '8"', '10"', '12"', 'rectangular (give W x H)'], unit: 'ea', opts: ['round with quadrant', 'rectangular opposed blade', 'with locking quadrant'] },
        { name: 'Fire / smoke damper', sizes: ['give W x H or diameter'], unit: 'ea', opts: ['fire damper 1.5 hr (dynamic)', 'combination fire/smoke 120 V', 'combination 24 V', 'ceiling radiation damper', 'sleeve + retaining angles'] },
        { name: 'Backdraft / barometric damper', sizes: ['6"', '8"', '10"', '12"', 'rectangular'], unit: 'ea' },
        { name: 'Access door, duct', sizes: ['8x8', '10x10', '12x12', '14x14', '18x18', '24x24'], unit: 'ea', opts: ['rectangular', 'round (give diameter)', 'insulated'] },
        { name: 'Turning vanes + rail', sizes: ['2"', '4-1/2"'], unit: 'ft' },
        { name: 'S-cleats, drive cleats, flat slips', sizes: ['24 ga', '22 ga'], unit: 'ea', opts: ['S-cleat', 'drive cleat', 'flat slip'] },
        { name: 'TDC / TDF corners, cleats, gasket', sizes: ['corners (box)', 'cleats 6"', 'gasket roll'], unit: 'ea' },
        { name: 'Sheet metal, flat stock', sizes: ['26 ga 4x8', '24 ga 4x8', '22 ga 4x8', '20 ga 4x8', 'aluminum 0.032', 'stainless 24 ga'], unit: 'sheet' },
        { name: 'Louver / wall cap / roof cap', sizes: ['4"', '6"', '8"', '10"', '12"', 'rectangular (give W x H)'], unit: 'ea', opts: ['wall cap with damper', 'roof cap', 'goose neck', 'louver aluminum'] }
      ] },
    { id: 'flex', name: 'Flexible duct & connectors', kw: ['flex', 'flexible duct', 'flex duct', 'canvas', 'flex connector', 'draw band', 'zip tie', 'panduit'],
      clarify: ['Insulated (R-6 / R-8) or non-insulated flex? Diameter and length (25 ft boxes)?', 'UL 181 class 1 / plenum rated needed?', 'Draw bands / panduit straps needed with it?'],
      items: [
        { name: 'Flex duct, insulated R-6', sizes: ['4"', '5"', '6"', '7"', '8"', '9"', '10"', '12"', '14"', '16"', '18"'], unit: 'box (25 ft)' },
        { name: 'Flex duct, insulated R-8', sizes: ['6"', '8"', '10"', '12"', '14"', '16"'], unit: 'box (25 ft)' },
        { name: 'Flex duct, non-insulated (uninsulated / aluminum)', sizes: ['4"', '6"', '8"', '10"', '12"'], unit: 'box (25 ft)' },
        { name: 'Flexible connector (canvas / Duro-Dyne) for equipment', sizes: ['3" x 3" x 3"', '4"', '6"'], unit: 'roll / ft', opts: ['neoprene (Metal-Fab / Excelon)', 'Durolon', 'with metal edges'] },
        { name: 'Panduit straps / draw bands', sizes: ['24"', '36"', 'draw band 6"-12"'], unit: 'bag / ea' }
      ] },
    { id: 'air_devices', name: 'Grilles, registers & diffusers', kw: ['diffuser', 'grille', 'register', 'linear', 'slot', 'return', 'supply', 'exhaust', 'louver face', 'titus', 'price', 'krueger', 'metalaire'],
      clarify: ['Type: ceiling supply diffuser (square plaque / louvered), return grille, sidewall register, linear slot, egg crate?', 'Face size and neck size (e.g. 24x24 face, 10" round neck) or duct size for sidewall (e.g. 12x6)?', 'Lay-in (T-bar) or surface mount; frame type; color (white / aluminum)?', 'Manufacturer / model if specified on the submittal (Titus, Price, Krueger, Metalaire)?'],
      items: [
        { name: 'Ceiling supply diffuser, square (24x24 lay-in)', sizes: ['6" neck', '8" neck', '10" neck', '12" neck', '14" neck'], unit: 'ea', opts: ['plaque (Titus OMNI)', '4-way louvered', '3-way', '2-way', 'with damper'] },
        { name: 'Return / exhaust grille (ceiling)', sizes: ['12x12', '18x18', '22x22 (24x24)', '24x12', '24x24'], unit: 'ea', opts: ['egg crate', '1/2" deflection (Titus 350)', 'filter grille', 'lay-in', 'surface'] },
        { name: 'Sidewall supply register, double deflection', sizes: ['8x4', '10x4', '10x6', '12x6', '14x6', '16x8', '18x8', '24x10'], unit: 'ea', opts: ['with OBD damper', 'aluminum', 'steel'] },
        { name: 'Sidewall return grille', sizes: ['10x6', '12x6', '14x6', '16x8', '18x8', '24x12', '30x12'], unit: 'ea', opts: ['45° blade', 'with damper', 'filter grille'] },
        { name: 'Linear slot diffuser', sizes: ['1 slot', '2 slot', '3 slot', '4 slot'], unit: 'ft', opts: ['3/4" slot', '1" slot', 'with plenum', 'end caps', 'length (2 / 4 / 5 / 6 ft)'] },
        { name: 'Round ceiling diffuser', sizes: ['6"', '8"', '10"', '12"', '14"'], unit: 'ea', opts: ['adjustable', 'with damper'] },
        { name: 'Door / transfer grille', sizes: ['12x12', '18x12', '24x12', '24x18'], unit: 'ea' },
        { name: 'Louver (exterior)', sizes: ['give W x H'], unit: 'ea', opts: ['drainable', 'with bird screen', 'with damper'] }
      ] },
    { id: 'insulation', name: 'Insulation (duct & pipe)', kw: ['insulation', 'insulate', 'armaflex', 'armacell', 'duct wrap', 'fsk', 'liner', 'fiberglass', 'asj', 'pipe insulation', 'k-flex', 'rubatex', 'jacket', 'pvc jacket', 'aluminum jacket', 'board', 'mineral wool'],
      clarify: ['Duct wrap (FSK faced R-6 1.5" / R-8 2") or duct liner (1/2" / 1") or duct board?', 'Pipe: closed-cell (Armaflex / K-Flex) or fiberglass with ASJ? Pipe size (copper OD or IPS) and wall thickness (1/2", 3/4", 1", 1-1/2")?', 'Length needed (6 ft sticks / rolls), plus fittings, adhesive, tape, PVC or aluminum jacket?'],
      items: [
        { name: 'Duct wrap, fiberglass FSK', sizes: ['1-1/2" R-6 (4 ft x 100 ft)', '2" R-8 (4 ft x 75 ft)', '1" R-4.2'], unit: 'roll' },
        { name: 'Duct liner, fiberglass', sizes: ['1/2" (4 x 100 ft)', '1" (4 x 50 ft)', '1-1/2"'], unit: 'roll', opts: ['with liner adhesive', 'with pins & clips'] },
        { name: 'Duct board', sizes: ['1" 4x8', '1-1/2" 4x8', '2" 4x8'], unit: 'sheet' },
        { name: 'Pipe insulation, closed-cell (Armaflex / K-Flex), copper sizes', sizes: ['1/4"', '3/8"', '1/2"', '5/8"', '3/4"', '7/8"', '1-1/8"', '1-3/8"', '1-5/8"', '2-1/8"'], unit: 'ft', pack: '6 ft sticks', opts: ['3/8" wall', '1/2" wall', '3/4" wall', '1" wall', 'self-seal', 'UV outdoor (with paint)'] },
        { name: 'Pipe insulation, closed-cell (Armaflex / K-Flex), iron pipe sizes', sizes: ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"', '2-1/2"', '3"', '4"'], unit: 'ft', pack: '6 ft sticks', opts: ['1/2" wall', '3/4" wall', '1" wall', '1-1/2" wall'] },
        { name: 'Pipe insulation, fiberglass ASJ (SSL)', sizes: ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"', '2-1/2"', '3"', '4"'], unit: 'ft', pack: '3 ft sections', opts: ['1" wall', '1-1/2" wall', '2" wall'] },
        { name: 'Insulation fittings / PVC fitting covers', sizes: ['1/2"-4"'], unit: 'ea', opts: ['90° elbow', 'tee', 'valve cover', 'flange cover'] },
        { name: 'Armaflex sheet / roll (tanks, large pipe)', sizes: ['1/2" x 36" x 48"', '3/4"', '1"'], unit: 'sheet / roll', opts: ['self-adhesive'] },
        { name: 'Insulation adhesive / tape / finish', sizes: ['Armaflex 520 adhesive (qt / gal)', 'Armaflex tape 2" x 30 ft', 'FSK tape 3" x 50 yd', 'ASJ tape', 'Armaflex WB finish (paint)', 'mastic (Foster)'], unit: 'ea' },
        { name: 'PVC / aluminum jacketing', sizes: ['give pipe + insulation size'], unit: 'ft', opts: ['PVC 20 mil', 'aluminum 0.016', 'elbow covers', 'bands / rivets'] },
        { name: 'Mineral wool / fire wrap (grease duct, firestop)', sizes: ['1-1/2" 3M Fire Barrier', 'FyreWrap', 'mineral wool batt'], unit: 'roll / bag' }
      ] },
    { id: 'sealants', name: 'Sealants, tapes & adhesives', kw: ['sealant', 'sealer', 'mastic', 'duct seal', 'hardcast', 'foil tape', 'tape', 'caulk', 'silicone', 'firestop', 'fire caulk', 'spray foam', 'great stuff', 'glue', 'adhesive', 'pipe dope', 'teflon', 'thread sealant', 'rtv'],
      clarify: ['What is it sealing: duct joints (water-based mastic / Hardcast), pipe threads (Teflon tape / pipe dope — gas rated?), penetrations (fire-rated caulk / spray foam), outdoor (silicone / RTV)?', 'Container: tube (10 oz), quart, gallon, bucket? Quantity?', 'Color (white / clear / gray / red) if visible?'],
      items: [
        { name: 'Duct sealant, water-based mastic', sizes: ['10 oz tube', 'quart', 'gallon', '5 gal pail'], unit: 'ea', opts: ['Hardcast Iron-Grip 601', 'DP 1010', 'Duct Butter', 'UL 181'] },
        { name: 'Foil tape (UL 181 FX / B-FX)', sizes: ['2" x 50 yd', '2-1/2" x 60 yd', '3" x 50 yd'], unit: 'roll' },
        { name: 'Duct tape (cloth) / electrical tape', sizes: ['2" cloth', '3/4" electrical (black)', 'colored phase tape'], unit: 'roll' },
        { name: 'Thread sealant', sizes: ['Teflon tape 1/2"', 'Teflon tape 3/4" (gas, yellow)', 'pipe dope (RectorSeal #5) 8 oz', 'Gasoila', 'Megaloc'], unit: 'ea' },
        { name: 'Silicone / RTV / caulk', sizes: ['10 oz tube'], unit: 'ea', opts: ['100% silicone clear', 'white', 'high-temp red RTV', 'gray RTV', 'acrylic latex paintable'] },
        { name: 'Firestop sealant / putty / collar', sizes: ['10 oz tube', '20 oz sausage', 'putty pad', 'collar (give pipe size)'], unit: 'ea', opts: ['3M CP 25WB+', 'Hilti FS-ONE', 'Hilti CP 606', 'intumescent'] },
        { name: 'Spray foam', sizes: ['12 oz can', '24 oz'], unit: 'ea', opts: ['Great Stuff gaps & cracks', 'fire block (orange)', 'window & door'] },
        { name: 'Contact / liner adhesive & primer', sizes: ['quart', 'gallon', 'spray can'], unit: 'ea' },
        { name: 'Gasket / weatherstrip / Neoprene', sizes: ['1/8" x 1" roll', '1/4" x 1"', 'butyl tape'], unit: 'roll' }
      ] },
    { id: 'hangers', name: 'Hangers, supports & anchors', kw: ['hanger', 'strap', 'threaded rod', 'all thread', 'rod', 'unistrut', 'strut', 'beam clamp', 'clevis', 'anchor', 'tapcon', 'wedge anchor', 'sleeve anchor', 'drop in', 'red head', 'hilti', 'clamp', 'riser clamp', 'split ring', 'loop hanger', 'trapeze', 'angle iron', 'channel', 'bracket'],
      clarify: ['What is being hung: duct (strap / trapeze), pipe (clevis / loop / split ring / riser clamp — give pipe size), equipment (strut / angle)?', 'Rod size (1/4", 3/8", 1/2") and length (10 ft sticks or cut)? Nuts, washers, couplings?', 'Anchor type for the structure: concrete (wedge / sleeve / drop-in / Tapcon), steel (beam clamp), wood (lag)? Size and quantity?', 'Strut: 1-5/8" x 1-5/8" 12 ga (P1000) or shallow (P3000), slotted, galvanized or green? Length?'],
      items: [
        { name: 'Threaded rod (all-thread), zinc', sizes: ['1/4"', '3/8"', '1/2"', '5/8"'], unit: 'ft', pack: '10 ft sticks (or 6 ft)', opts: ['zinc', 'galvanized', 'stainless'] },
        { name: 'Rod couplings / hex nuts / washers', sizes: ['1/4"', '3/8"', '1/2"', '5/8"'], unit: 'box', opts: ['coupling nut', 'hex nut', 'flat washer', 'lock washer', 'square strut washer'] },
        { name: 'Unistrut channel', sizes: ['P1000 1-5/8" 12 ga', 'P1000T slotted', 'P3000 shallow 13/16"', 'P5500 double'], unit: 'ft', pack: '10 ft / 20 ft', opts: ['pre-galvanized', 'HDG', 'green (PG)'] },
        { name: 'Strut fittings', sizes: ['P1006 spring nut 3/8"', 'P1008 spring nut 1/2"', 'P1010 spring nut 1/4"', '90° angle P1026', 'flat plate P1065', 'post base', 'end cap', 'pipe clamp (give size)'], unit: 'ea' },
        { name: 'Beam clamp', sizes: ['1/4"', '3/8"', '1/2"'], unit: 'ea', opts: ['malleable (B3033)', 'C-clamp with set screw', 'top beam clamp', 'flange clip'] },
        { name: 'Clevis hanger', sizes: ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"', '2-1/2"', '3"', '4"', '6"'], unit: 'ea', opts: ['standard', 'insulated (shield size)', 'copper-plated (copper pipe)'] },
        { name: 'Split ring / loop hanger / riser clamp', sizes: ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"', '2-1/2"', '3"', '4"'], unit: 'ea', opts: ['split ring (with extension)', 'loop / band hanger', 'riser clamp', 'copper-plated'] },
        { name: 'Insulation shield / saddle', sizes: ['give pipe + insulation size'], unit: 'ea', opts: ['galvanized shield 12"', 'wood block', 'calcium silicate insert'] },
        { name: 'Duct strap (hanger strap)', sizes: ['1" x 100 ft 28 ga', '1" x 100 ft 24 ga', '3/4" perforated'], unit: 'roll' },
        { name: 'Angle iron / flat bar', sizes: ['1-1/4" x 1-1/4" x 1/8"', '1-1/2" x 1-1/2" x 1/8"', '2" x 2" x 3/16"', '1-1/2" x 1/8" flat'], unit: 'ft', pack: '20 ft lengths' },
        { name: 'Concrete anchor', sizes: ['1/4"', '3/8"', '1/2"', '5/8"'], unit: 'box', opts: ['wedge anchor', 'sleeve anchor', 'drop-in anchor', 'Tapcon 1-3/4" / 2-1/4" / 3"', 'Hilti KB-TZ', 'epoxy (HIT-HY 200)'] },
        { name: 'Toggle / hollow wall anchor', sizes: ['1/4"', '3/8"'], unit: 'box', opts: ['toggle bolt', 'Snaptoggle', 'plastic anchor'] },
        { name: 'Lag screw / hanger bolt', sizes: ['1/4" x 2"', '3/8" x 3"', '1/2" x 4"'], unit: 'box' },
        { name: 'Vibration isolator / spring hanger', sizes: ['give equipment weight'], unit: 'ea', opts: ['neoprene pad', 'spring isolator 1" deflection', 'spring hanger', 'rubber-in-shear'] },
        { name: 'Equipment stand / curb / rail', sizes: ['give unit model'], unit: 'ea', opts: ['condenser pad (plastic 36x36)', 'wall bracket (mini-split)', 'roof rail / sleeper', 'curb adapter'] }
      ] },
    { id: 'fasteners', name: 'Screws, bolts & hardware', kw: ['screw', 'zip screw', 'self tap', 'tek', 'bolt', 'nut', 'washer', 'rivet', 'pop rivet', 'wire', 'tie wire', 'hardware'],
      clarify: ['Screw type: sheet metal zip screw (#8 x 1/2" hex head), Tek self-drilling (#10 / #12, length), drywall, wood?', 'Bolt size / length / grade, with nuts and washers?', 'Quantity — box of 100 / 500 / 1,000?'],
      items: [
        { name: 'Sheet metal (zip) screw, hex washer head', sizes: ['#8 x 1/2"', '#8 x 3/4"', '#10 x 1/2"', '#10 x 3/4"', '#10 x 1"'], unit: 'box (500 / 1000)', opts: ['zinc', 'with neoprene washer'] },
        { name: 'Self-drilling Tek screw', sizes: ['#10 x 3/4"', '#10 x 1"', '#12 x 1"', '#12 x 1-1/2"', '#12 x 2"', '1/4" x 2"'], unit: 'box', opts: ['hex head', 'wafer head', 'with bonded washer'] },
        { name: 'Drywall / wood screw', sizes: ['#6 x 1-1/4"', '#8 x 1-5/8"', '#8 x 2"', '#8 x 3"'], unit: 'box' },
        { name: 'Hex bolt + nut + washer', sizes: ['1/4"', '5/16"', '3/8"', '1/2"'], unit: 'ea', opts: ['length (1" / 1-1/2" / 2" / 3")', 'grade 5', 'grade 8', 'stainless', 'carriage bolt'] },
        { name: 'Pop rivet', sizes: ['1/8" x 1/8"', '1/8" x 1/4"', '3/16"'], unit: 'box', opts: ['aluminum', 'steel', 'stainless'] },
        { name: 'Tie wire / hanger wire', sizes: ['16 ga', '12 ga (ceiling)', '9 ga'], unit: 'roll' },
        { name: 'Zip ties', sizes: ['8"', '11"', '14"', '24"'], unit: 'bag', opts: ['black UV', 'natural', 'stainless'] }
      ] },
    { id: 'electrical', name: 'Electrical & controls', kw: ['thermostat', 'tstat', 't-stat', 'wire', 'cable', 'mc cable', 'thhn', 'disconnect', 'whip', 'breaker', 'contactor', 'capacitor', 'relay', 'transformer', 'sensor', 'control', 'bms', 'damper actuator', 'actuator', 'belimo', 'honeywell', 'ecobee', 'nest', 'conduit', 'emt', 'liquidtight', 'seal tite', 'box', 'junction'],
      clarify: ['Thermostat: heat/cool stages, heat pump, programmable / Wi-Fi, brand (Honeywell T6, Ecobee), 24 V or line-voltage?', 'Wire: thermostat wire (18/5, 18/8), THHN size & color, MC cable (12/2, 10/3) length? Plenum rated?', 'Disconnect: amps (30 / 60 A), fused / non-fused, NEMA 3R? Whip length (4 / 6 ft) and size?', 'Capacitor / contactor: exact rating from the unit (µF / voltage, amps / coil voltage)?'],
      items: [
        { name: 'Thermostat', sizes: ['Honeywell T6 Pro', 'Honeywell T4', 'Ecobee', 'Nest', 'line voltage (fan coil / PTAC)', 'wireless sensor'], unit: 'ea', opts: ['heat pump', '2H/2C', 'with humidity', 'locking cover'] },
        { name: 'Thermostat wire', sizes: ['18/2', '18/4', '18/5', '18/8', '20/4 shielded'], unit: 'ft', pack: '250 / 500 ft', opts: ['plenum (CMP)', 'non-plenum'] },
        { name: 'MC cable', sizes: ['14/2', '12/2', '12/3', '10/2', '10/3', '8/3', '6/3'], unit: 'ft', pack: '250 ft coils', opts: ['with ground', 'aluminum jacket', 'MC connectors'] },
        { name: 'THHN / THWN wire', sizes: ['14', '12', '10', '8', '6', '4'], unit: 'ft', opts: ['black', 'red', 'white', 'green', 'blue', '500 ft spool'] },
        { name: 'Disconnect switch', sizes: ['30 A', '60 A', '100 A'], unit: 'ea', opts: ['non-fused NEMA 3R', 'fused (give fuse size)', 'pull-out', 'single phase', 'three phase'] },
        { name: 'Liquidtight whip / flex conduit', sizes: ['1/2"', '3/4"', '1"'], unit: 'ea / ft', opts: ['4 ft whip 10/3', '6 ft whip', 'conduit by the foot + fittings'] },
        { name: 'EMT conduit & fittings', sizes: ['1/2"', '3/4"', '1"'], unit: 'ft', opts: ['set-screw connector', 'coupling', 'strap', '90° elbow', '4x4 box', 'blank cover'] },
        { name: 'Contactor / relay / transformer', sizes: ['contactor 30 A 24 V coil', 'contactor 40 A 1-pole', 'contactor 40 A 2-pole', 'fan relay 24 V (90-340)', 'transformer 40 VA 24 V', 'transformer 75 VA', 'time delay relay'], unit: 'ea' },
        { name: 'Capacitor', sizes: ['give µF / V from the unit (e.g. 45/5 µF 440 V)'], unit: 'ea', opts: ['dual run', 'single run', 'start capacitor', 'hard start kit'] },
        { name: 'Damper actuator (Belimo / Honeywell)', sizes: ['24 V', '120 V'], unit: 'ea', opts: ['on/off', 'modulating 0-10 V', 'spring return', 'direct couple (give torque: 45 / 90 / 180 in-lb)'] },
        { name: 'Sensors (temp / pressure / CO2)', sizes: ['duct temp', 'space temp', 'outdoor', 'strap-on', 'immersion with well', 'DP switch', 'CO2 / IAQ'], unit: 'ea' },
        { name: 'Fuses / breakers', sizes: ['give amps and type (e.g. 30 A time-delay, 20 A 1-pole breaker)'], unit: 'ea' },
        { name: 'Float / safety switch', sizes: ['SS1 (in-line)', 'SS2 (pan)', 'SS3', 'wet switch'], unit: 'ea' }
      ] },
    { id: 'equipment_parts', name: 'Equipment parts & accessories', kw: ['filter', 'belt', 'motor', 'blower', 'fan', 'pump', 'compressor', 'coil', 'igniter', 'pressure switch', 'gas valve', 'flame sensor', 'board', 'pad', 'drain pan', 'float', 'vfd', 'sheave', 'pulley', 'bearing'],
      clarify: ['Which unit (make, model, serial from the nameplate) and which part — part number if visible?', 'Filter: exact size (e.g. 20x25x1 / 24x24x2) and rating (MERV 8 / 11 / 13), pleated or fiberglass, quantity?', 'Belt: number printed on the belt (e.g. A42 / B50 / 4L450)? Motor: HP, voltage, RPM, frame, shaft?'],
      items: [
        { name: 'Air filter, pleated', sizes: ['16x20x1', '16x25x1', '20x20x1', '20x25x1', '24x24x1', '24x24x2', '20x25x4', '16x25x4', 'other (give size)'], unit: 'ea / case', opts: ['MERV 8', 'MERV 11', 'MERV 13', 'fiberglass throwaway', 'HEPA'] },
        { name: 'V-belt', sizes: ['A (4L) — give number', 'B (5L) — give number', 'AX cogged', 'BX cogged'], unit: 'ea' },
        { name: 'Motor (blower / condenser fan / pump)', sizes: ['give HP, V, RPM, frame, shaft, rotation'], unit: 'ea', opts: ['ECM', 'PSC', '3-phase', 'with bracket / mount'] },
        { name: 'Compressor / coil / major part', sizes: ['give unit model + serial'], unit: 'ea', opts: ['OEM', 'with crankcase heater', 'with filter drier'] },
        { name: 'Ignition / gas parts', sizes: ['hot surface igniter', 'flame sensor', 'gas valve (give model)', 'pressure switch (give setpoint)', 'inducer motor', 'rollout switch', 'control board (give model)'], unit: 'ea' },
        { name: 'Drain pan / condensate pan', sizes: ['give unit size'], unit: 'ea', opts: ['auxiliary pan with float switch', 'plastic', 'galvanized'] },
        { name: 'Pump / circulator', sizes: ['Taco 007', 'Taco 0015', 'Grundfos UPS 15-58', 'Grundfos UPS 26-99', 'give model'], unit: 'ea', opts: ['flanged', 'threaded', 'with flanges / isolation valves'] },
        { name: 'VFD / starter', sizes: ['give HP, voltage, phase'], unit: 'ea' },
        { name: 'Sheave / pulley / bearing', sizes: ['give bore, OD, belt section'], unit: 'ea' }
      ] },
    { id: 'tools_consumables', name: 'Tools, consumables & PPE', kw: ['bit', 'blade', 'drill bit', 'hole saw', 'sawzall', 'grinder', 'cutting wheel', 'glove', 'ppe', 'glasses', 'mask', 'rag', 'cleaner', 'coil cleaner', 'brush', 'marker', 'sharpie', 'tape measure', 'level', 'ladder', 'extension cord', 'battery', 'propane', 'bucket', 'bag', 'trash', 'ramboard', 'plastic', 'drop cloth', 'tarp'],
      clarify: ['Exact size / type (hole saw diameter, blade length & TPI, bit size, cutting wheel 4-1/2" / 14")?', 'Brand / battery platform for power tools (Milwaukee M18 / M12, DeWalt 20 V)?', 'Quantity (pack size)?'],
      items: [
        { name: 'Hole saw / arbor', sizes: ['1"', '1-1/2"', '2"', '2-1/2"', '3"', '4"', '4-1/2"', '5"', '6"'], unit: 'ea', opts: ['bi-metal', 'carbide (tile / concrete)', 'arbor'] },
        { name: 'Drill bit', sizes: ['1/8"', '3/16"', '1/4"', '5/16"', '3/8"', '1/2"', '5/8"', '3/4"'], unit: 'ea', opts: ['twist (steel)', 'SDS masonry', 'SDS-Max', 'step bit', 'Tapcon bit'] },
        { name: 'Reciprocating saw blade', sizes: ['6"', '9"', '12"'], unit: 'pack', opts: ['metal 14 TPI', 'metal 18 TPI', 'wood', 'demolition', 'carbide (The Torch)'] },
        { name: 'Cutting / grinding wheel', sizes: ['4-1/2"', '7"', '14" chop saw'], unit: 'ea', opts: ['cut-off metal', 'grinding', 'flap disc', 'diamond (masonry)'] },
        { name: 'Sheet metal consumables', sizes: ['snips (red / green / yellow)', 'seamer', 'crimper', 'nibbler', 'shear blades'], unit: 'ea' },
        { name: 'Coil cleaner / chemicals', sizes: ['gallon'], unit: 'ea', opts: ['evaporator (no-rinse)', 'condenser (alkaline)', 'Nu-Calgon', 'pan tablets', 'degreaser'] },
        { name: 'PPE', sizes: ['gloves L / XL', 'safety glasses', 'N95 masks', 'hard hat', 'hearing protection', 'harness', 'high-vis vest'], unit: 'ea / box' },
        { name: 'Protection / cleanup', sizes: ['Ram Board', 'plastic sheeting 6 mil', 'drop cloth', 'tarp', 'contractor bags', 'rags (box)', 'brooms'], unit: 'ea' },
        { name: 'Batteries / cords / lights', sizes: ['M18 battery', 'M12 battery', 'DeWalt 20 V', 'extension cord 50 ft 12 ga', '100 ft', 'work light', 'AA / AAA / 9 V'], unit: 'ea' },
        { name: 'Marking / measuring', sizes: ['Sharpie (box)', 'paint marker', 'tape measure 25 ft', 'torpedo level', 'chalk line'], unit: 'ea' },
        { name: 'Ladder / lift rental', sizes: ['6 ft', '8 ft', '10 ft', '12 ft', 'extension 24 ft', 'scissor lift (give height)', 'Baker scaffold'], unit: 'ea', opts: ['fiberglass', 'rental (dates)'] }
      ] },
    { id: 'gas_vent', name: 'Gas, venting & exhaust', kw: ['vent', 'b-vent', 'pvc vent', 'flue', 'chimney', 'exhaust fan', 'roof jack', 'termination', 'gas connector', 'csst', 'trac pipe', 'gas regulator', 'dryer vent', 'grease duct', 'hood'],
      clarify: ['Vent type: B-vent (double wall, give diameter), PVC / CPVC / polypropylene (condensing, give diameter), stainless (grease / category III)?', 'Fittings: elbows, tee, rain cap, storm collar, firestop, wall thimble, termination kit (give unit model)?', 'Gas: CSST size / length with fittings, or flexible appliance connector (size, length, with valve)?'],
      items: [
        { name: 'B-vent (double wall) pipe & fittings', sizes: ['3"', '4"', '5"', '6"', '7"', '8"'], unit: 'ft / ea', opts: ['pipe (1 / 2 / 3 / 5 ft)', 'adjustable elbow', 'tee', 'rain cap', 'storm collar', 'roof flashing', 'firestop spacer', 'draft hood connector'] },
        { name: 'Condensing vent (PVC / polypropylene)', sizes: ['2"', '3"', '4"'], unit: 'ft / ea', opts: ['PVC Sch 40 pipe', 'termination kit (give unit)', 'concentric kit', 'PolyPro (Duravent)'] },
        { name: 'CSST gas tubing (TracPipe / Gastite) & fittings', sizes: ['1/2"', '3/4"', '1"', '1-1/4"'], unit: 'ft', opts: ['fittings (ea)', 'striker plates', 'bonding clamp', 'termination mount'] },
        { name: 'Gas appliance connector (flexible, with valve)', sizes: ['1/2" x 24"', '1/2" x 36"', '3/4" x 24"', '3/4" x 36"', '3/4" x 48"'], unit: 'ea' },
        { name: 'Gas regulator / shutoff / union', sizes: ['1/2"', '3/4"', '1"', '1-1/4"'], unit: 'ea', opts: ['line regulator (give inlet / outlet pressure)', 'gas cock', 'ground joint union'] },
        { name: 'Exhaust fan (inline / ceiling / roof)', sizes: ['give CFM + model from drawings'], unit: 'ea', opts: ['Fantech inline', 'Panasonic ceiling', 'roof upblast', 'with speed control', 'backdraft damper'] },
        { name: 'Dryer vent / wall cap', sizes: ['4"'], unit: 'ea', opts: ['semi-rigid aluminum 8 ft', 'wall cap with damper', 'roof jack', 'periscope'] },
        { name: 'Roof curb / roof jack / flashing', sizes: ['give duct size'], unit: 'ea', opts: ['insulated curb', 'pitch pocket', 'storm collar'] }
      ] },
    { id: 'minisplit', name: 'Mini-split & VRF accessories', kw: ['mini split', 'minisplit', 'mini-split', 'vrf', 'line hide', 'slimduct', 'fortress', 'wall bracket', 'branch box', 'refnet', 'drain hose', 'wall sleeve', 'cap'],
      clarify: ['Unit brand / model (Mitsubishi, Daikin, LG, Fujitsu) for OEM parts?', 'Line hide: size (3" / 4" / 5.5"), color, which fittings (90° inside / outside, flat elbow, wall inlet, soffit inlet, end), total length?', 'Wall bracket / pad load (unit weight)? Condensate: gravity hose or pump?'],
      items: [
        { name: 'Line set cover (SlimDuct / Fortress)', sizes: ['3"', '4"', '5.5"'], unit: 'ft / ea', opts: ['straight 6.5 ft', '90° inside corner', '90° outside corner', 'flat elbow', 'wall inlet', 'soffit inlet', 'end cap', 'coupler', 'white', 'brown', 'ivory'] },
        { name: 'Condenser wall bracket', sizes: ['up to 200 lb', 'up to 300 lb', 'up to 450 lb'], unit: 'ea' },
        { name: 'Condenser pad / stand', sizes: ['24x24', '36x36', '16x36 (mini-split)', 'snow stand 18"'], unit: 'ea' },
        { name: 'Refnet / branch kit / Y-joint (VRF)', sizes: ['give system model'], unit: 'ea' },
        { name: 'Wall sleeve / cap / putty', sizes: ['2-1/2" sleeve', '3" sleeve', 'wall cap', 'duct seal putty'], unit: 'ea' },
        { name: 'Drain hose (mini-split, corrugated) + adapter', sizes: ['5/8"', '3/4"'], unit: 'ft' },
        { name: 'Flare nuts / flare fittings (R-410A)', sizes: ['1/4"', '3/8"', '1/2"', '5/8"', '3/4"'], unit: 'ea', opts: ['flare nut', 'flare union', 'reducing flare', 'flare to sweat adapter'] },
        { name: 'Wi-Fi adapter / wired controller', sizes: ['give unit model'], unit: 'ea' }
      ] }
  ];
  function esc(s) { return String(s); }
  var API = {
    categories: C,
    // categories whose keywords appear in a request (lower-case match); empty → all names only
    match: function (text) {
      var t = ' ' + String(text || '').toLowerCase().replace(/[^a-z0-9"'\/\-\s.]/g, ' ') + ' ';
      return C.filter(function (c) { return c.kw.some(function (k) { return t.indexOf(k.toLowerCase()) >= 0; }) || t.indexOf(c.name.toLowerCase().split(' ')[0]) >= 0; });
    },
    // compact text of the catalog for an AI prompt: matched categories in full, the rest as names only
    text: function (requestText) {
      var hit = API.match(requestText), ids = {};
      hit.forEach(function (c) { ids[c.id] = 1; });
      var out = [];
      C.forEach(function (c) {
        if (!ids[c.id]) { out.push('- ' + c.name + ' (items: ' + c.items.slice(0, 4).map(function (i) { return i.name.split(',')[0]; }).join('; ') + '…)'); return; }
        out.push('## ' + c.name + '\nQuestions to settle: ' + c.clarify.join(' | '));
        c.items.forEach(function (i) { out.push('- ' + i.name + ' — sizes: ' + i.sizes.join(', ') + (i.opts ? ' — options: ' + i.opts.join(', ') : '') + ' — unit: ' + i.unit + (i.pack ? ' (' + i.pack + ')' : '')); });
      });
      return out.join('\n');
    },
    search: function (q) {
      q = String(q || '').toLowerCase().trim(); if (!q) return [];
      var words = q.split(/\s+/), res = [];
      C.forEach(function (c) { c.items.forEach(function (i) {
        var hay = (c.name + ' ' + i.name + ' ' + (i.opts || []).join(' ') + ' ' + c.kw.join(' ')).toLowerCase();
        var score = words.reduce(function (a, w) { return a + (hay.indexOf(w) >= 0 ? 1 : 0); }, 0);
        if (score === words.length) res.push({ cat: c, item: i });
      }); });
      return res.slice(0, 40);
    }
  };
  window.NWHVACCatalog = API;
})();
