const express = require('express');
const requireAdmin = require('../middleware/requireAdmin');
const {
  getCustomer,
  getCustomerLoans,
  getCustomers,
  getInterestTypes,
  getLoan,
  getLoans,
  postLoan,
  putLoan,
  removeLoan,
  updateInterestType
} = require('../controllers/loanController');

const router = express.Router();

router.use(requireAdmin);
router.get('/customers', getCustomers);
router.get('/customers/:id/loans', getCustomerLoans);
router.get('/customers/:id', getCustomer);
router.get('/loans/interest-types', getInterestTypes);
router.patch('/loans/interest-types/:typeKey', updateInterestType);
router.get('/loans', getLoans);
router.get('/loans/:id', getLoan);
router.post('/loans', postLoan);
router.put('/loans/:id', putLoan);
router.delete('/loans/:id', removeLoan);

module.exports = router;
