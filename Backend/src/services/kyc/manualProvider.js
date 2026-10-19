const KycProvider = require('./kycProvider');

class ManualKycProvider extends KycProvider {
  get name() {
    return 'manual';
  }

  async startVerification() {
    return { provider: this.name, externalReference: null, status: 'pending' };
  }
}

module.exports = ManualKycProvider;
