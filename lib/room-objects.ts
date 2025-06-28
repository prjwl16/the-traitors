// Predefined room objects for the Room of Secrets
export const ROOM_OBJECTS = [
  { name: "Broken Mirror", description: "A shattered looking glass that reflects fractured truths" },
  { name: "Ancient Candle", description: "A melted candle that has witnessed countless secrets" },
  { name: "Dusty Portrait", description: "A painting of unknown nobility, eyes that seem to follow" },
  { name: "Ornate Fountain", description: "A dry fountain where wishes once echoed" },
  { name: "Grandfather Clock", description: "Time stands still at midnight, forever frozen" },
  { name: "Velvet Armchair", description: "A throne where conspiracies were once whispered" },
  { name: "Crystal Chandelier", description: "Hanging crystals that catch and scatter light mysteriously" },
  { name: "Mahogany Desk", description: "A writing surface scarred by urgent, secret correspondence" },
  { name: "Stone Fireplace", description: "Cold ashes hide the remnants of burned evidence" },
  { name: "Silk Curtains", description: "Heavy drapes that conceal what lies beyond" },
  { name: "Persian Rug", description: "Intricate patterns that tell stories of distant lands" },
  { name: "Wooden Chest", description: "A locked container holding forgotten treasures" },
  { name: "Silver Goblet", description: "A chalice that has tasted both wine and poison" },
  { name: "Leather Journal", description: "Blank pages waiting for confessions to be written" },
  { name: "Iron Key", description: "A key that unlocks doors better left closed" },
  { name: "Marble Statue", description: "A silent witness carved in eternal stone" },
  { name: "Stained Glass Window", description: "Colored light filters through scenes of betrayal" },
  { name: "Antique Vase", description: "Delicate porcelain that holds more than flowers" },
  { name: "Golden Frame", description: "An empty frame waiting for the perfect deception" },
  { name: "Wooden Cross", description: "A symbol of faith in a room of faithlessness" },
  { name: "Brass Compass", description: "Points not north, but toward hidden truths" },
  { name: "Ivory Chess Set", description: "A game where pawns become kings and kings fall" },
  { name: "Crystal Ball", description: "Clouded glass that reveals futures best left unknown" },
  { name: "Feathered Quill", description: "A writing instrument that has signed many fates" },
  { name: "Copper Scales", description: "Justice weighs heavy in the balance" },
  { name: "Emerald Brooch", description: "A jewel that has adorned both saints and sinners" },
  { name: "Pewter Chalice", description: "A humble cup that has held sacred and profane" },
  { name: "Obsidian Dagger", description: "A blade as dark as the secrets it has carved" },
  { name: "Ruby Ring", description: "A band that has sealed both love and betrayal" },
  { name: "Silver Locket", description: "Contains a portrait of someone long forgotten" },
  { name: "Brass Telescope", description: "Sees far into the distance, but not into hearts" },
  { name: "Wooden Mask", description: "A face to hide behind when truth becomes unbearable" },
  { name: "Iron Shackles", description: "Chains that once bound more than just the body" },
  { name: "Golden Hourglass", description: "Sand falls like tears, marking time's passage" },
  { name: "Ceramic Urn", description: "Holds ashes of burned bridges and broken promises" },
  { name: "Velvet Glove", description: "Soft exterior hiding an iron fist within" },
  { name: "Crystal Prism", description: "Breaks white light into a spectrum of deception" },
  { name: "Leather Bound Book", description: "Ancient wisdom or dangerous knowledge lies within" },
  { name: "Silver Bell", description: "Rings to announce arrivals and departures" },
  { name: "Wooden Crucifix", description: "Bears the weight of countless confessions" },
  { name: "Brass Lantern", description: "Casts shadows that dance with hidden meanings" },
  { name: "Ivory Figurine", description: "A small statue of unknown significance" },
  { name: "Copper Coin", description: "Currency that has changed many hands and hearts" },
  { name: "Silk Handkerchief", description: "Soft fabric that has dried both tears and blood" },
  { name: "Stone Gargoyle", description: "A guardian that watches over dark secrets" },
  { name: "Glass Orb", description: "Transparent sphere reflecting distorted realities" },
  { name: "Iron Horseshoe", description: "Luck runs out for those who trust too easily" },
  { name: "Wooden Rosary", description: "Prayer beads worn smooth by desperate hands" },
  { name: "Bronze Medal", description: "Honor tarnished by the deeds it commemorates" },
  { name: "Ceramic Dove", description: "Peace is fragile and easily shattered" }
] as const

// Personal items that players can be assigned
export const PERSONAL_ITEMS = [
  "Silver Coin", "Pocket Watch", "Cracked Letter", "Silk Ribbon",
  "Brass Button", "Ivory Comb", "Leather Pouch", "Glass Marble",
  "Wooden Token", "Metal Thimble", "Paper Rose", "Wax Seal",
  "Bone Dice", "Cloth Patch", "Stone Pebble", "Shell Fragment",
  "Feather Plume", "Thread Spool", "Ink Vial", "Candle Stub",
  "Key Fragment", "Mirror Shard", "Pressed Flower", "Copper Wire",
  "Velvet Cord", "Pearl Button", "Tin Whistle", "Clay Bead",
  "Lace Trim", "Gold Flake", "Iron Nail", "Chalk Piece"
] as const

export function getRandomPersonalItems(count: number = 4): string[] {
  const shuffled = [...PERSONAL_ITEMS].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}
