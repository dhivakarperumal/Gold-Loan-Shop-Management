const ManualKycProvider = require('./manualProvider');

function getKycProvider() {
  const providerName = String(process.env.KYC_PROVIDER || 'manual').trim().toLowerCase();
  if (providerName === 'manual') return new ManualKycProvider();
  throw new Error(`Unsupported KYC_PROVIDER "${providerName}". Only manual is configured.`);
}

module.exports = { getKycProvider };
