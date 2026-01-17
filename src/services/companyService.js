// Mock implementation for company settings service
// In a real application, this would interact with a backend or a database.

const MOCK_DELAY = 500; // milliseconds

export const companyService = {
  // Fetch company settings
  getCompanySettings: async () => {
    return new Promise(resolve => {
      setTimeout(() => {
        // In a real app, you would fetch this from a persistent store.
        // For now, we return some mock data or previously saved settings.
        const settings = JSON.parse(localStorage.getItem('companySettings')) || {
          companyName: 'Golden Lion',
          currency: 'د.ل',
          language: 'ar',
          address: 'Tripoli, Libya',
          phone: '091-0000000',
          terms: 'Goods sold are not returnable after 14 days.'
        };
        resolve(settings);
      }, MOCK_DELAY);
    });
  },

  // Save company settings
  saveCompanySettings: async (settingsData) => {
    return new Promise(resolve => {
      setTimeout(() => {
        // In a real app, you would save this to a database.
        // For this mock, we'll use localStorage.
        localStorage.setItem('companySettings', JSON.stringify(settingsData));
        resolve(settingsData);
      }, MOCK_DELAY);
    });
  },
};
