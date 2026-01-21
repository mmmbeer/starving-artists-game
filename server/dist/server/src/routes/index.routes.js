"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Landing page routes
const express_1 = require("express");
const router = (0, express_1.Router)();
// Landing page
router.get('/', (_req, res) => {
    res.render('pages/index', {
        title: 'Starving Artists',
    });
});
// Game rules page
router.get('/rules', (_req, res) => {
    res.render('pages/rules', {
        title: 'Game Rules - Starving Artists',
    });
});
// About page
router.get('/about', (_req, res) => {
    res.render('pages/about', {
        title: 'About - Starving Artists',
    });
});
exports.default = router;
