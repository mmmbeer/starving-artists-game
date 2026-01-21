"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultAllowedOrigins = exports.getAllowedOrigins = void 0;
const parseOrigins = (value) => value
    ? value
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0)
    : [];
const DEFAULT_ALLOWED_ORIGINS = [
    'https://www.starvingartistsgame.com',
    'https://starvingartistsgame.com',
    'http://localhost:5173', // Development
    'http://localhost:4000' // Development API
];
const getAllowedOrigins = () => {
    const envOrigins = parseOrigins(process.env.ALLOWED_ORIGINS);
    if (envOrigins.length > 0) {
        return envOrigins;
    }
    return DEFAULT_ALLOWED_ORIGINS;
};
exports.getAllowedOrigins = getAllowedOrigins;
const getDefaultAllowedOrigins = () => DEFAULT_ALLOWED_ORIGINS;
exports.getDefaultAllowedOrigins = getDefaultAllowedOrigins;
