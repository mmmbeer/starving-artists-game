"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchCanvasDefinitions = void 0;
const query_1 = require("./query");
const common_1 = require("../../../shared/types/common");
const isPaintColor = (value) => typeof value === 'string' && common_1.PAINT_COLOR_PALETTE.includes(value);
const normalizeAllowedColors = (value) => {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter(isPaintColor);
};
const parseSquares = (rawSquares) => {
    return rawSquares
        .map((raw, index) => {
        const square = raw;
        const position = square.position;
        const x = typeof position?.x === 'number' ? position.x : index;
        const y = typeof position?.y === 'number' ? position.y : 0;
        const id = typeof square.id === 'string' && square.id.trim() ? square.id : `square-${index}`;
        return {
            id,
            position: { x, y },
            allowedColors: normalizeAllowedColors(square.allowedColors ?? square.allowed_colors ?? [])
        };
    })
        .sort((a, b) => (a.position.y - b.position.y) || (a.position.x - b.position.x));
};
const parseLayoutJson = (raw) => {
    if (typeof raw === 'string') {
        try {
            return JSON.parse(raw);
        }
        catch (error) {
            throw new Error('Failed to parse layout_json for canvas row');
        }
    }
    if (raw && typeof raw === 'object') {
        return raw;
    }
    throw new Error('Canvas layout_json is missing');
};
const buildDefinition = (row) => {
    const layout = parseLayoutJson(row.layout_json);
    if (!Array.isArray(layout.squares) || layout.squares.length === 0) {
        throw new Error(`Canvas ${row.id} is missing square definitions`);
    }
    const id = typeof layout.id === 'string' && layout.id.trim() ? layout.id : `canvas-${row.id}`;
    const squares = parseSquares(layout.squares);
    return {
        id,
        title: row.title,
        artist: row.artist ?? undefined,
        year: row.year ?? undefined,
        filename: row.filename ?? undefined,
        starValue: row.star_value,
        paintValue: row.paint_value,
        foodValue: row.food_value,
        squares
    };
};
const fetchCanvasDefinitions = async () => {
    const rows = await (0, query_1.dbQuery)('SELECT id, title, artist, year, star_value, paint_value, food_value, layout_json, filename FROM canvases ORDER BY id ASC');
    if (rows.length === 0) {
        throw new Error('No canvases available to build the deck');
    }
    return rows.map(buildDefinition);
};
exports.fetchCanvasDefinitions = fetchCanvasDefinitions;
