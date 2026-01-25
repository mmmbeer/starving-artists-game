// random-name.js
// Importable artist-style name generator for games

// -----------------------------
// FIRST NAMES (GENDERED)
// -----------------------------

const FIRST_NAMES = {
    male: [
        "Pablo","Claude","Vincent","Henri","Edgar","Salvador","Wassily","Paul","Marc","Gustav",
        "Egon","Diego","Amedeo","Joan","Lucian","Albrecht","Michel","Rene","Camille","Theo",
        "Remy","Jasper","Francis","Ansel","Turner","August","Leon","Emil","Oscar","Felix",
        "Bruno","Karl","Otto","Theo","Anton","Matteo","Luca","Rafael","Sandro","Nico",
        "Julien","Sebastian","Anders","Milo","Hugo","Elias","Victor","Noel","Armand","Leo"
    ],
    female: [
        "Frida","Georgia","Artemisia","Sonia","Camille","Tamara","Mary","Agnes","Berthe","Paula",
        "Louise","Hilma","Leonora","Eva","Elaine","Dorothea","Alice","Judith","Remedios","Bridget",
        "Yayoi","Zina","Suzanne","Clara","Ida","Sophie","Margaret","Nina","Vera","Elsa",
        "Helene","Beatrice","Amelia","Lucia","Iris","Cecilia","Marianne","Florence","Isabelle","Rosa",
        "Alma","Sylvia","Esther","Noemi","Bianca","Adelaide","Ingrid","Freya","Lotte","Anouk"
    ]
};

// -----------------------------
// LAST NAMES (ART-INSPIRED)
// -----------------------------

const LAST_NAMES = [
    "Montero","Delacroix","Vanholt","Rivelli","Klimar","Goyen","Modaire","Rousseau",
    "Vermeeran","Picard","Turnell","Matison","Kandor","Chagren","Bonnier","Deglane",
    "Caravel","Duchan","Morandi","Soutine","Bruegal","Corvino","Fauvre","Bellini",
    "Tintaro","Grecco","Sorrel","Lautrecq","Pissaro","Cezarin","Manetti","Vigliani",
    "Renoix","Courbetti","Daurel","Fresnay","Vallot","Seghers","Ensor","Redmont",
    "Hoppern","Rothen","Basari","Kleefer","Calvino","Orlans","Kokorin","Mirov"
];

// -----------------------------
// PREFIXES & SUFFIXES
// -----------------------------

const PREFIXES = [
    "Master","Old","Young","Grand","Avant","Neo","Urban","Silent","Golden",
    "Midnight","Wandering","Eccentric","Sacred","Profane","Crimson"
];

const SUFFIXES = [
    "the Bold","the Younger","the Elder","of the Canvas","of the North",
    "of Ash and Oil","the Visionary","the Restless","the Abstract",
    "the Obsessed","the Precise","the Unbound"
];

// -----------------------------
// UTILITIES
// -----------------------------

function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function chance(probability) {
    return Math.random() < probability;
}

// -----------------------------
// MAIN GENERATOR
// -----------------------------

/**
 * Generate a random artist-style name
 * @param {Object} options
 * @param {"male"|"female"|"any"} options.gender
 * @param {boolean} options.allowPrefix
 * @param {boolean} options.allowSuffix
 * @returns {string}
 */
export function randomName(options = {}) {
    const {
        gender = "any",
        allowPrefix = true,
        allowSuffix = true
    } = options;

    let firstNamePool;

    if (gender === "male") {
        firstNamePool = FIRST_NAMES.male;
    } else if (gender === "female") {
        firstNamePool = FIRST_NAMES.female;
    } else {
        firstNamePool = FIRST_NAMES.male.concat(FIRST_NAMES.female);
    }

    const firstName = randomItem(firstNamePool);
    const lastName = randomItem(LAST_NAMES);

    let name = `${firstName} ${lastName}`;

    if (allowPrefix && chance(0.25)) {
        name = `${randomItem(PREFIXES)} ${name}`;
    }

    if (allowSuffix && chance(0.3)) {
        name = `${name}, ${randomItem(SUFFIXES)}`;
    }

    return name;
}

// -----------------------------
// OPTIONAL BULK GENERATOR
// -----------------------------

export function generateBulkNames(count = 10, options = {}) {
    const results = [];
    for (let i = 0; i < count; i++) {
        results.push(randomName(options));
    }
    return results;
}
