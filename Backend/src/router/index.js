const express = require('express');
const authRouter = require('./authRouter');
const categoryRouter = require('./categoryRouter');
const metalRouter = require('./metalRouter');
const productRouter = require('./productRouter');
const loanCustomerRouter = require('./loanCustomerRouter');
const loanRouter = require('./loanRouter');
const bannerRouter = require('./bannerRouter');
const goldRateRouter = require('./goldRateRouter');

const router = express.Router();

router.use('/auth', authRouter);
router.use('/categories', categoryRouter);
router.use('/metals', metalRouter);
router.use('/products', productRouter);
router.use('/loan-customers', loanCustomerRouter);
router.use('/banners', bannerRouter);
router.use('/gold-rates', goldRateRouter);
router.use(loanRouter);

module.exports = router;
