const GRID_SIZE = 60;
const ATOM_SIZE = 44;

const VALENCY = { 'C': 4, 'O': 2, 'H': 1, 'N': 3, 'Cl': 1, 'Br': 1, 'I': 1 };

const GROUPS = {
    methyl: {
        label: "-CH₃",
        atoms: [
            { type: 'C', dx: 0, dy: 0 },
            { type: 'H', dx: 1, dy: 0 },
            { type: 'H', dx: 0, dy: -1 },
            { type: 'H', dx: 0, dy: 1 }
        ],
        bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1]]
    },
    hydroxyl: {
        label: "-OH",
        atoms: [
            { type: 'O', dx: 0, dy: 0 },
            { type: 'H', dx: 1, dy: 0 }
        ],
        bonds: [[0, 1, 1]]
    },
    carboxyl: {
        label: "-COOH",
        atoms: [
            { type: 'C', dx: 0, dy: 0 },
            { type: 'O', dx: 0, dy: 1 },
            { type: 'O', dx: 1, dy: 0 },
            { type: 'H', dx: 2, dy: 0 }
        ],
        bonds: [[0, 1, 2], [0, 2, 1], [2, 3, 1]]
    },
    amino: {
        label: "-NH₂",
        atoms: [
            { type: 'N', dx: 0, dy: 0 },
            { type: 'H', dx: 0, dy: -1 },
            { type: 'H', dx: 0, dy: 1 }
        ],
        bonds: [[0, 1, 1], [0, 2, 1]]
    },
    formyl: {
        label: "-CHO",
        atoms: [
            { type: 'C', dx: 0, dy: 0 },
            { type: 'O', dx: 0, dy: 1 },
            { type: 'H', dx: 1, dy: 0 }
        ],
        bonds: [[0, 1, 2], [0, 2, 1]]
    },
    ether: {
        label: "-O-",
        atoms: [
            { type: 'O', dx: 0, dy: 0 }
        ],
        bonds: []
    },
    ketone: {
        label: "-CO-",
        atoms: [
            { type: 'C', dx: 0, dy: 0 },
            { type: 'O', dx: 0, dy: 1 }
        ],
        bonds: [[0, 1, 2]]
    },
    ester: {
        label: "-COO-",
        atoms: [
            { type: 'C', dx: 0, dy: 0 },
            { type: 'O', dx: 0, dy: 1 },
            { type: 'O', dx: 1, dy: 0 }
        ],
        bonds: [[0, 1, 2], [0, 2, 1]]
    },
    ethyl: {
        label: "-C₂H₅",
        atoms: [
            { type: 'C', dx: 0, dy: 0 },
            { type: 'H', dx: 0, dy: -1 },
            { type: 'H', dx: 0, dy: 1 },
            { type: 'C', dx: 1, dy: 0 },
            { type: 'H', dx: 1, dy: -1 },
            { type: 'H', dx: 1, dy: 1 },
            { type: 'H', dx: 2, dy: 0 }
        ],
        bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [3, 4, 1], [3, 5, 1], [3, 6, 1]]
    }
};

// 高校化学で扱う主要な有機化合物データベース（組成式ベース）
// 構造異性体は chemistry.js の構造解析で識別
const MOLECULE_DB = [
    // === 無機化合物 ===
    { formula: "H2O1", name: "水", structuralFormula: "H₂O", props: "極性溶媒、生命の源" },
    { formula: "C1O2", name: "二酸化炭素", structuralFormula: "CO₂", props: "温室効果ガス、ドライアイス" },
    { formula: "N1H3", name: "アンモニア", structuralFormula: "NH₃", props: "刺激臭、塩基性" },

    // === アルカン（飽和炭化水素） ===
    { formula: "C1H4", name: "メタン", structuralFormula: "CH₄", props: "天然ガスの主成分、最も単純な炭化水素" },
    { formula: "C2H6", name: "エタン", structuralFormula: "C₂H₆", props: "天然ガス成分、無色無臭の気体" },
    { formula: "C3H8", name: "プロパン", structuralFormula: "C₃H₈", props: "LPガスの主成分、燃料" },
    { formula: "C4H10", name: "ブタン", structuralFormula: "C₄H₁₀", props: "ライター燃料、異性体あり" },
    { formula: "C5H12", name: "ペンタン", structuralFormula: "C₅H₁₂", props: "揮発性液体、異性体3種" },
    { formula: "C6H14", name: "ヘキサン", structuralFormula: "C₆H₁₄", props: "有機溶媒、異性体5種" },
    { formula: "C7H16", name: "ヘプタン", structuralFormula: "C₇H₁₆", props: "ガソリン成分" },
    { formula: "C8H18", name: "オクタン", structuralFormula: "C₈H₁₈", props: "ガソリンのオクタン価基準" },
    { formula: "C9H20", name: "ノナン", structuralFormula: "C₉H₂₀", props: "原油成分、液体" },
    { formula: "C10H22", name: "デカン", structuralFormula: "C₁₀H₂₂", props: "原油成分、液体" },

    // === アルケン（不飽和炭化水素） ===
    { formula: "C2H4", name: "エチレン（エテン）", structuralFormula: "C₂H₄", props: "植物ホルモン、ポリエチレン原料" },
    { formula: "C3H6", name: "プロピレン（プロペン）", structuralFormula: "C₃H₆", props: "ポリプロピレン原料" },
    { formula: "C4H8", name: "ブテン", structuralFormula: "C₄H₈", props: "異性体あり（1-ブテン、2-ブテンなど）", tags: ["alkene"] },
    { formula: "C5H10", name: "ペンテン", structuralFormula: "C₅H₁₀", props: "二重結合を持つ炭化水素", tags: ["alkene"] },
    { formula: "C6H12", name: "ヘキセン", structuralFormula: "C₆H₁₂", props: "二重結合を持つ炭化水素", tags: ["alkene"] },
    { formula: "C7H14", name: "ヘプテン", structuralFormula: "C₇H₁₄", props: "二重結合を持つ炭化水素", tags: ["alkene"] },
    { formula: "C8H16", name: "オクテン", structuralFormula: "C₈H₁₆", props: "二重結合を持つ炭化水素", tags: ["alkene"] },
    { formula: "C9H18", name: "ノネン", structuralFormula: "C₉H₁₈", props: "二重結合を持つ炭化水素", tags: ["alkene"] },
    { formula: "C10H20", name: "デセン", structuralFormula: "C₁₀H₂₀", props: "二重結合を持つ炭化水素", tags: ["alkene"] },

    // === アルキン ===
    { formula: "C2H2", name: "アセチレン", structuralFormula: "CH≡CH", props: "三重結合、溶接用ガス", tags: ["alkyne"] },
    { formula: "C3H4", name: "プロピン", structuralFormula: "C₃H₄", props: "三重結合を持つ炭化水素", tags: ["alkyne"] },
    { formula: "C4H6", name: "ブチン", structuralFormula: "C₄H₆", props: "三重結合を持つ炭化水素", tags: ["alkyne"] },
    { formula: "C5H8", name: "ペンチン", structuralFormula: "C₅H₈", props: "三重結合を持つ炭化水素", tags: ["alkyne"] },
    { formula: "C6H10", name: "ヘキシン", structuralFormula: "C₆H₁₀", props: "三重結合を持つ炭化水素", tags: ["alkyne"] },
    { formula: "C7H12", name: "ヘプチン", structuralFormula: "C₇H₁₂", props: "三重結合を持つ炭化水素", tags: ["alkyne"] },
    { formula: "C8H14", name: "オクチン", structuralFormula: "C₈H₁₄", props: "三重結合を持つ炭化水素", tags: ["alkyne"] },
    { formula: "C9H16", name: "ノニン", structuralFormula: "C₉H₁₆", props: "三重結合を持つ炭化水素", tags: ["alkyne"] },
    { formula: "C10H18", name: "デシン", structuralFormula: "C₁₀H₁₈", props: "三重結合を持つ炭化水素", tags: ["alkyne"] },

    // === 芳香族炭化水素 ===
    { formula: "C6H6", name: "ベンゼン", structuralFormula: "C₆H₆", props: "芳香族化合物の基本、発がん性" },
    { formula: "C7H8", name: "トルエン", structuralFormula: "C₇H₈", props: "ベンゼンのメチル誘導体、溶媒" },
    { formula: "C8H10", name: "キシレン", structuralFormula: "C₈H₁₀", props: "異性体3種（o-,m-,p-）" },
    { formula: "C10H8", name: "ナフタレン", structuralFormula: "C₁₀H₈", props: "防虫剤、縮合環" },

    // === アルコール ===
    { formula: "C1H4O1", name: "メタノール", structuralFormula: "CH₃OH", props: "メチルアルコール、有毒", tags: ["alcohol"] },
    { formula: "C2H6O1", name: "エタノール", structuralFormula: "C₂H₅OH", props: "エチルアルコール、酒の成分", tags: ["alcohol"] },
    { formula: "C3H8O1", name: "プロパノール", structuralFormula: "C₃H₇OH", props: "1-プロパノール、2-プロパノール（異性体）", tags: ["alcohol"] },
    { formula: "C4H10O1", name: "ブタノール", structuralFormula: "C₄H₉OH", props: "異性体多数", tags: ["alcohol"] },
    { formula: "C2H6O2", name: "エチレングリコール", structuralFormula: "C₂H₄(OH)₂", props: "不凍液、2価アルコール", tags: ["alcohol"] },
    { formula: "C3H8O3", name: "グリセリン", structuralFormula: "C₃H₅(OH)₃", props: "3価アルコール、保湿剤", tags: ["alcohol"] },
    { formula: "C6H6O1", name: "フェノール", structuralFormula: "C₆H₅OH", props: "石炭酸、弱酸性", tags: ["phenol"] },
    { formula: "C7H8O1", name: "クレゾール", structuralFormula: "CH₃C₆H₄OH", props: "消毒薬、異性体3種", tags: ["phenol"] },

    // === エーテル ===
    { formula: "C2H6O1", name: "ジメチルエーテル", structuralFormula: "CH₃OCH₃", props: "エタノールの異性体、燃料", tags: ["ether"] },
    { formula: "C3H8O1", name: "エチルメチルエーテル", structuralFormula: "C₂H₅OCH₃", props: "プロパノールの異性体", tags: ["ether"] },
    { formula: "C4H10O1", name: "ジエチルエーテル", structuralFormula: "C₂H₅OC₂H₅", props: "麻酔薬、有機溶媒", tags: ["ether"] },

    // === アルデヒド ===
    { formula: "C1H2O1", name: "ホルムアルデヒド", structuralFormula: "HCHO", props: "ホルマリン、刺激臭", tags: ["aldehyde"] },
    { formula: "C2H4O1", name: "アセトアルデヒド", structuralFormula: "CH₃CHO", props: "酢酸の前駆体", tags: ["aldehyde"] },
    { formula: "C2H4O1", name: "ビニルアルコール", structuralFormula: "CH₂=CHOH", props: "不安定なエノール、アセトアルデヒドへ転移", tags: ["alkene", "hydroxyl"] },
    { formula: "C3H6O1", name: "プロピオンアルデヒド", structuralFormula: "C₂H₅CHO", props: "アルデヒド基を持つ", tags: ["aldehyde"] },
    { formula: "C7H6O1", name: "ベンズアルデヒド", structuralFormula: "C₆H₅CHO", props: "アーモンド臭", tags: ["aldehyde", "aromatic"] },

    // === ケトン ===
    { formula: "C3H6O1", name: "アセトン", structuralFormula: "CH₃COCH₃", props: "除光液、有機溶媒", tags: ["ketone"] },
    { formula: "C4H8O1", name: "メチルエチルケトン", structuralFormula: "CH₃COC₂H₅", props: "MEK、溶媒", tags: ["ketone"] },

    // === カルボン酸 ===
    { formula: "C1H2O2", name: "ギ酸", structuralFormula: "HCOOH", props: "アリが持つ酸、最も単純なカルボン酸", tags: ["carboxylic_acid"] },
    { formula: "C2H4O2", name: "酢酸", structuralFormula: "CH₃COOH", props: "食酢の主成分、弱酸", tags: ["carboxylic_acid"] },
    { formula: "C3H6O2", name: "プロピオン酸", structuralFormula: "C₂H₅COOH", props: "保存料", tags: ["carboxylic_acid"] },
    { formula: "C4H8O2", name: "酪酸", structuralFormula: "C₃H₇COOH", props: "バターの臭い成分", tags: ["carboxylic_acid"] },
    { formula: "C5H10O2", name: "吉草酸", structuralFormula: "C₄H₉COOH", props: "足の臭い成分", tags: ["carboxylic_acid"] },
    { formula: "C16H32O2", name: "パルミチン酸", structuralFormula: "C₁₅H₃₁COOH", props: "飽和脂肪酸" },
    { formula: "C18H36O2", name: "ステアリン酸", structuralFormula: "C₁₇H₃₅COOH", props: "飽和脂肪酸" },
    { formula: "C18H34O2", name: "オレイン酸", structuralFormula: "C₁₇H₃₃COOH", props: "不飽和脂肪酸" },
    { formula: "C7H6O2", name: "安息香酸", structuralFormula: "C₆H₅COOH", props: "防腐剤" },
    { formula: "C2H2O4", name: "シュウ酸", structuralFormula: "HOOC-COOH", props: "2価カルボン酸、還元剤" },
    { formula: "C4H6O4", name: "コハク酸", structuralFormula: "HOOC(CH₂)₂COOH", props: "2価カルボン酸", tags: ["carboxylic_acid"] },
    { formula: "C4H4O4", name: "マレイン酸", structuralFormula: "HOOC-CH=CH-COOH", props: "シス型、融点が低い", tags: ["carboxylic_acid", "alkene", "cis"] },
    { formula: "C4H4O4", name: "フマル酸", structuralFormula: "HOOC-CH=CH-COOH", props: "トランス型、融点が高い", tags: ["carboxylic_acid", "alkene", "trans"] },

    // === エステル ===
    { formula: "C2H4O2", name: "ギ酸メチル", structuralFormula: "HCOOCH₃", props: "エステル", tags: ["ester"] },
    { formula: "C3H6O2", name: "酢酸メチル", structuralFormula: "CH₃COOCH₃", props: "果実臭", tags: ["ester"] },
    { formula: "C4H8O2", name: "酢酸エチル", structuralFormula: "CH₃COOC₂H₅", props: "接着剤、果実臭", tags: ["ester"] },
    { formula: "C5H10O2", name: "酢酸プロピル", structuralFormula: "CH₃COOC₃H₇", props: "洋ナシの香り", tags: ["ester"] },
    { formula: "C6H12O2", name: "酢酸ブチル", structuralFormula: "CH₃COOC₄H₉", props: "バナナの香り", tags: ["ester"] },
    { formula: "C7H14O2", name: "酢酸ペンチル", structuralFormula: "CH₃COOC₅H₁₁", props: "洋ナシの香り", tags: ["ester"] },

    // === アミン ===
    { formula: "C1H3N1", name: "メチルアミン", structuralFormula: "CH₃NH₂", props: "魚の臭い、塩基性" },
    { formula: "C2H5N1", name: "エチルアミン", structuralFormula: "C₂H₅NH₂", props: "塩基性" },
    { formula: "C2H7N1", name: "ジメチルアミン", structuralFormula: "(CH₃)₂NH", props: "2級アミン" },
    { formula: "C3H9N1", name: "トリメチルアミン", structuralFormula: "(CH₃)₃N", props: "3級アミン、魚の腐敗臭" },
    { formula: "C6H5N1", name: "アニリン", structuralFormula: "C₆H₅NH₂", props: "芳香族アミン、染料原料" },

    // === アミノ酸 ===
    { formula: "C2H5N1O2", name: "グリシン", structuralFormula: "NH₂CH₂COOH", props: "最も単純なアミノ酸" },
    { formula: "C3H7N1O2", name: "アラニン", structuralFormula: "CH₃CH(NH₂)COOH", props: "α-アミノ酸" },
    { formula: "C3H7N1O3", name: "セリン", structuralFormula: "HOCH₂CH(NH₂)COOH", props: "ヒドロキシ基を持つ" },
    { formula: "C4H9N1O2", name: "γ-アミノ酪酸", structuralFormula: "NH₂(CH₂)₃COOH", props: "GABA、神経伝達物質" },
    { formula: "C5H9N1O2", name: "グルタミン酸", structuralFormula: "HOOC(CH₂)₂CH(NH₂)COOH", props: "うま味成分" },

    // === ニトロ化合物 ===
    { formula: "C6H5N1O2", name: "ニトロベンゼン", structuralFormula: "C₆H₅NO₂", props: "アニリン合成原料" },
    { formula: "C7H5N3O6", name: "トリニトロトルエン", structuralFormula: "C₇H₅(NO₂)₃", props: "TNT、爆薬" },

    // === ハロゲン化合物 ===
    { formula: "C1H3Cl1", name: "クロロメタン", structuralFormula: "CH₃Cl", props: "塩化メチル" },
    { formula: "C1H2Cl2", name: "ジクロロメタン", structuralFormula: "CH₂Cl₂", props: "塩化メチレン、溶媒" },
    { formula: "C1H1Cl3", name: "トリクロロメタン", structuralFormula: "CHCl₃", props: "クロロホルム、麻酔薬" },
    { formula: "C1Cl4", name: "テトラクロロメタン", structuralFormula: "CCl₄", props: "四塩化炭素、消火剤" },
    { formula: "C2H5Cl1", name: "クロロエタン", structuralFormula: "C₂H₅Cl", props: "塩化エチル" },
    { formula: "C2H4Cl2", name: "1,2-ジクロロエタン", structuralFormula: "ClCH₂CH₂Cl", props: "塩化エチレン" },
    { formula: "C2H3Cl1", name: "塩化ビニル", structuralFormula: "CH₂=CHCl", props: "PVC原料" },
    { formula: "C2H3Cl3", name: "1,1,1-トリクロロエタン", structuralFormula: "CH₃CCl₃", props: "溶媒" },
    { formula: "C2H2Cl4", name: "テトラクロロエタン", structuralFormula: "CHCl₂CHCl₂", props: "溶媒" },
    { formula: "C2Cl4", name: "テトラクロロエチレン", structuralFormula: "CCl₂=CCl₂", props: "ドライクリーニング溶媒" },
    { formula: "C6H5Cl1", name: "クロロベンゼン", structuralFormula: "C₆H₅Cl", props: "芳香族ハロゲン化物" },

    // === 糖類 ===
    { formula: "C6H12O6", name: "グルコース", structuralFormula: "C₆H₁₂O₆", props: "ブドウ糖、単糖類" },
    { formula: "C6H12O6", name: "フルクトース", structuralFormula: "C₆H₁₂O₆", props: "果糖、単糖類" },
    { formula: "C12H22O11", name: "スクロース", structuralFormula: "C₁₂H₂₂O₁₁", props: "ショ糖、二糖類" },
    { formula: "C12H22O11", name: "マルトース", structuralFormula: "C₁₂H₂₂O₁₁", props: "麦芽糖、二糖類" },
    { formula: "C12H22O11", name: "ラクトース", structuralFormula: "C₁₂H₂₂O₁₁", props: "乳糖、二糖類" },

    // === その他の重要化合物 ===
    { formula: "C3H6O3", name: "乳酸", structuralFormula: "CH₃CH(OH)COOH", props: "ヒドロキシ酸、筋肉疲労" },
    { formula: "C6H8O7", name: "クエン酸", structuralFormula: "C₆H₈O₇", props: "柑橘類の酸味、TCA回路" },
    { formula: "C9H8O4", name: "アスピリン", structuralFormula: "C₉H₈O₄", props: "アセチルサリチル酸、解熱鎮痛剤" },
    { formula: "C17H19N1O3", name: "モルヒネ", structuralFormula: "C₁₇H₁₉NO₃", props: "アルカロイド、鎮痛剤" },
    { formula: "C8H10N4O2", name: "カフェイン", structuralFormula: "C₈H₁₀N₄O₂", props: "覚醒作用" },
];
