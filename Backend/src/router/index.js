const express = require('express');
const authRouter = require('./authRouter');
const categoryRouter = require('./categoryRouter');

const router = express.Router();

router.use('/auth', authRouter);
router.use('/categories', categoryRouter);

module.exports = router;
