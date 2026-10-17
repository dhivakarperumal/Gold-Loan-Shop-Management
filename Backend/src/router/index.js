const express = require('express');
const authRouter = require('./authRouter');
const categoryRouter = require('./categoryRouter');
const metalRouter = require('./metalRouter');
const productRouter = require('./productRouter');

const router = express.Router();

router.use('/auth', authRouter);
router.use('/categories', categoryRouter);
router.use('/metals', metalRouter);
router.use('/products', productRouter);

module.exports = router;
