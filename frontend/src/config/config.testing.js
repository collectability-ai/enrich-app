const config = {
  environment: 'testing',
  aws: {
    region: 'us-east-2',
    userPoolId: 'us-east-2_EHz7xWNbm',
    userPoolWebClientId: '64iqduh82e6tvd5orlkn7rktc8',
    identityPoolId: 'us-east-2:f9c3a654-2df9-49fb-8161-09cbc0c58634',
    authDomain: 'us-east-2ehz7xwnbm.auth.us-east-2.amazoncognito.com'
  },
  api: {
    baseUrl: 'https://testing.contactvalidate.com/api'
  },
  auth: {
    redirectSignIn: 'https://testing.contactvalidate.com/',
    redirectSignOut: 'https://testing.contactvalidate.com/',
    cookieDomain: 'testing.contactvalidate.com'
  }
};

export default config;