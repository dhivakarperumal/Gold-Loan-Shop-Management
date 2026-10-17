class KycProvider {
  get name() {
    throw new Error('KYC provider must expose a provider name');
  }

  async startVerification() {
    throw new Error('KYC provider must implement startVerification');
  }
}

module.exports = KycProvider;
