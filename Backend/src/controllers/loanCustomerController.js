const {
  addLoanCustomerDocuments,
  createLoanCustomer,
  deleteLoanCustomer,
  deleteLoanCustomerDocument,
  getLoanCustomerDocumentById,
  getLoanCustomerDocumentByRef,
  getLoanCustomerById,
  listLoanCustomerDocuments,
  listLoanCustomers,
  updateLoanCustomer
} = require('../modules/loanCustomerModule');
const {
  getLoanCustomerDocumentPath,
  getLoanCustomerPhotoPath,
  isValidLoanCustomerDocument,
  isValidLoanCustomerPhoto,
  removeLoanCustomerDocuments,
  removeLoanCustomerPhoto
} = require('../middleware/loanCustomerPhotoUpload');
const fs = require('node:fs');

const CUSTOMER_TYPES = new Set(['Individual', 'Business']);
const KYC_STATUSES = new Set(['Pending', 'Verified', 'Rejected']);
const DOCUMENT_TYPES = new Set([
  'aadhaar', 'pan', 'voter_id', 'driving_license', 'passport', 'ration_card', 'other'
]);
const DOCUMENT_SIDES = new Set(['front', 'back']);
const FIELDS = [
  'customer_type', 'full_name', 'mobile', 'alternate_mobile', 'email', 'date_of_birth',
  'gender', 'occupation', 'address', 'city', 'district', 'state', 'pincode',
  'guarantor_name', 'guarantor_mobile', 'guarantor_email', 'guarantor_relationship', 'guarantor_address',
  'kyc_status', 'photo_url', 'notes'
];
const MAX_LENGTHS = {
  customer_type: 20,
  full_name: 150,
  mobile: 15,
  alternate_mobile: 15,
  email: 254,
  guarantor_email: 254,
  gender: 30,
  occupation: 100,
  city: 100,
  district: 100,
  state: 100,
  pincode: 10,
  guarantor_name: 150,
  guarantor_mobile: 15,
  guarantor_relationship: 100,
  kyc_status: 20
};

function normalizeCustomer(body) {
  const customer = {};
  for (const field of FIELDS) {
    const value = body[field];
    customer[field] = value == null || value === '' ? null : String(value).trim();
  }
  customer.customer_type = customer.customer_type || 'Individual';
  customer.kyc_status = customer.kyc_status || 'Pending';
  customer.full_name = customer.full_name || '';
  customer.mobile = customer.mobile || '';
  customer.photo_url = customer.photo_url || null;

  for (const [field, maxLength] of Object.entries(MAX_LENGTHS)) {
    if (customer[field] && customer[field].length > maxLength) {
      return { error: `${field.replaceAll('_', ' ')} must be ${maxLength} characters or fewer` };
    }
  }
  if (!customer.full_name || !customer.mobile) {
    return { error: 'Customer name and primary mobile are required' };
  }
  const requiredFields = [
    'email', 'gender', 'address', 'city', 'district', 'state', 'pincode',
    'guarantor_name', 'guarantor_mobile', 'guarantor_relationship', 'guarantor_address'
  ];
  const missingField = requiredFields.find((field) => !customer[field]);
  if (missingField) {
    return { error: `${missingField.replaceAll('_', ' ')} is required` };
  }
  if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
    return { error: 'Enter a valid email address' };
  }
  if (!CUSTOMER_TYPES.has(customer.customer_type)) {
    return { error: 'Customer type must be Individual or Business' };
  }
  if (!KYC_STATUSES.has(customer.kyc_status)) {
    return { error: 'KYC status must be Pending, Verified, or Rejected' };
  }
  if (![customer.mobile, customer.alternate_mobile, customer.guarantor_mobile].filter(Boolean).every((phone) => /^[+\d][\d\s()-]{5,14}$/.test(phone))) {
    return { error: 'Enter a valid mobile number' };
  }
  if (customer.date_of_birth && !/^\d{4}-\d{2}-\d{2}$/.test(customer.date_of_birth)) {
    return { error: 'Date of birth must use YYYY-MM-DD format' };
  }
  if (customer.photo_url && !getLoanCustomerPhotoPath(customer.photo_url)) {
    return { error: 'Photo reference is invalid' };
  }
  return { customer };
}

function validId(value) {
  return /^\d+$/.test(value) && BigInt(value) > 0n;
}

async function getCustomers(req, res, next) {
  try {
    return res.json(await listLoanCustomers(String(req.query.search || '').trim()));
  } catch (error) {
    return next(error);
  }
}

async function getCustomerById(req, res, next) {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Customer ID is invalid' });
  try {
    const customer = await getLoanCustomerById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    return res.json(customer);
  } catch (error) {
    return next(error);
  }
}

async function postCustomer(req, res, next) {
  const { customer, error } = normalizeCustomer(req.body || {});
  if (error) return res.status(400).json({ message: error });
  try {
    return res.status(201).json(await createLoanCustomer(customer));
  } catch (createError) {
    return next(createError);
  }
}

async function postCustomerPhoto(req, res, next) {
  if (!req.file) return res.status(400).json({ message: 'Choose a PNG or JPG photo' });
  try {
    if (!isValidLoanCustomerPhoto(req.file.path, req.file.mimetype)) {
      await fs.promises.unlink(req.file.path);
      return res.status(400).json({ message: 'The uploaded file is not a valid PNG or JPG image' });
    }
    return res.status(201).json({
      photo_url: `/api/loan-customers/photos/${req.file.filename}`
    });
  } catch (error) {
    return next(error);
  }
}

async function getCustomerPhoto(req, res, next) {
  const photoUrl = `/api/loan-customers/photos/${req.params.filename}`;
  const filePath = getLoanCustomerPhotoPath(photoUrl);
  if (!filePath) return res.status(400).json({ message: 'Photo reference is invalid' });
  try {
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Customer photo not found' });
    return res.sendFile(filePath, (error) => {
      if (error && !res.headersSent) next(error);
    });
  } catch (error) {
    return next(error);
  }
}

async function getCustomerDocuments(req, res, next) {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Customer ID is invalid' });
  try {
    if (!await getLoanCustomerById(req.params.id)) return res.status(404).json({ message: 'Customer not found' });
    return res.json(await listLoanCustomerDocuments(req.params.id));
  } catch (error) {
    return next(error);
  }
}

async function postCustomerDocuments(req, res, next) {
  const files = req.files || [];
  const cleanup = () => Promise.all(files.map((file) => fs.promises.unlink(file.path).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
  })));
  let documentsPersisted = false;
  if (!validId(req.params.id)) {
    await cleanup();
    return res.status(400).json({ message: 'Customer ID is invalid' });
  }
  const documentType = String(req.body.document_type || '').trim();
  const documentSide = String(req.body.document_side || '').trim();
  if (!DOCUMENT_TYPES.has(documentType)) {
    await cleanup();
    return res.status(400).json({ message: 'Select a supported KYC document type' });
  }
  if (!DOCUMENT_SIDES.has(documentSide)) {
    await cleanup();
    return res.status(400).json({ message: 'Select the front or back side of the document' });
  }
  if (files.length === 0) return res.status(400).json({ message: 'Choose at least one document file' });

  try {
    if (!await getLoanCustomerById(req.params.id)) {
      await cleanup();
      return res.status(404).json({ message: 'Customer not found' });
    }
    for (const file of files) {
      if (!isValidLoanCustomerDocument(file.path, file.mimetype)) {
        await cleanup();
        return res.status(400).json({ message: 'One or more files are not valid PDF, PNG, or JPG documents' });
      }
    }
    const documents = files.map((file) => ({
      document_type: documentType,
      document_side: documentSide,
      file_ref: `/api/loan-customers/documents/${file.filename}`,
      original_name: file.originalname.slice(0, 255),
      mime_type: file.mimetype,
      file_size: file.size
    }));
    const saved = await addLoanCustomerDocuments(req.params.id, documents);
    documentsPersisted = true;
    await removeLoanCustomerDocuments(saved.replacedDocuments);
    return res.status(201).json(saved.documents);
  } catch (error) {
    if (!documentsPersisted) await cleanup();
    return next(error);
  }
}

async function getCustomerDocument(req, res, next) {
  const fileRef = `/api/loan-customers/documents/${req.params.filename}`;
  const filePath = getLoanCustomerDocumentPath(fileRef);
  if (!filePath) return res.status(400).json({ message: 'Document reference is invalid' });
  try {
    const document = await getLoanCustomerDocumentByRef(fileRef);
    if (!document || !fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Customer document not found' });
    }
    res.set('Content-Type', document.mime_type);
    res.set('Content-Disposition', `inline; filename="${encodeURIComponent(document.original_name)}"`);
    res.set('X-Content-Type-Options', 'nosniff');
    return res.sendFile(filePath, (error) => {
      if (error && !res.headersSent) next(error);
    });
  } catch (error) {
    return next(error);
  }
}

async function removeCustomerDocument(req, res, next) {
  if (!validId(req.params.documentId)) return res.status(400).json({ message: 'Document ID is invalid' });
  try {
    const document = await getLoanCustomerDocumentById(req.params.documentId);
    if (!document || String(document.customer_id) !== String(req.params.id)) {
      return res.status(404).json({ message: 'Customer document not found' });
    }
    if (!await deleteLoanCustomerDocument(req.params.documentId)) {
      return res.status(404).json({ message: 'Customer document not found' });
    }
    await removeLoanCustomerDocuments([document]);
    return res.json({ message: 'Customer document deleted successfully' });
  } catch (error) {
    return next(error);
  }
}

async function putCustomer(req, res, next) {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Customer ID is invalid' });
  const { customer, error } = normalizeCustomer(req.body || {});
  if (error) return res.status(400).json({ message: error });
  try {
    const existing = await getLoanCustomerById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    const updated = await updateLoanCustomer(req.params.id, customer);
    if (existing.photo_url && existing.photo_url !== updated.photo_url) {
      await removeLoanCustomerPhoto(existing.photo_url);
    }
    return res.json(updated);
  } catch (updateError) {
    return next(updateError);
  }
}

async function removeCustomer(req, res, next) {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Customer ID is invalid' });
  try {
    const customer = await getLoanCustomerById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    const documents = await listLoanCustomerDocuments(req.params.id);
    if (!await deleteLoanCustomer(req.params.id)) return res.status(404).json({ message: 'Customer not found' });
    await removeLoanCustomerPhoto(customer.photo_url);
    await removeLoanCustomerDocuments(documents);
    return res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ message: 'This customer has loan records and cannot be deleted.' });
    }
    return next(error);
  }
}

module.exports = {
  getCustomerById,
  getCustomerById,
  getCustomerDocument,
  getCustomerDocuments,
  getCustomerPhoto,
  getCustomers,
  postCustomer,
  postCustomerDocuments,
  postCustomerPhoto,
  putCustomer,
  removeCustomerDocument,
  removeCustomer
};
