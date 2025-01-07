const stripePriceIDs = {
  basic3: process.env.REACT_APP_NODE_ENV === 'development'
    ? process.env.REACT_APP_STRIPE_TEST_PRICE_ID_BASIC_3
    : process.env.REACT_APP_STRIPE_LIVE_PRICE_ID_BASIC_3,
  basic10: process.env.REACT_APP_NODE_ENV === 'development'
    ? process.env.REACT_APP_STRIPE_TEST_PRICE_ID_BASIC_10
    : process.env.REACT_APP_STRIPE_LIVE_PRICE_ID_BASIC_10,
  basic50: process.env.REACT_APP_NODE_ENV === 'development'
    ? process.env.REACT_APP_STRIPE_TEST_PRICE_ID_BASIC_50
    : process.env.REACT_APP_STRIPE_LIVE_PRICE_ID_BASIC_50,
  popular150: process.env.REACT_APP_NODE_ENV === 'development'
    ? process.env.REACT_APP_STRIPE_TEST_PRICE_ID_POPULAR_150
    : process.env.REACT_APP_STRIPE_LIVE_PRICE_ID_POPULAR_150,
  premium500: process.env.REACT_APP_NODE_ENV === 'development'
    ? process.env.REACT_APP_STRIPE_TEST_PRICE_ID_PREMIUM_500
    : process.env.REACT_APP_STRIPE_LIVE_PRICE_ID_PREMIUM_500,
  premium1000: process.env.REACT_APP_NODE_ENV === 'development'
    ? process.env.REACT_APP_STRIPE_TEST_PRICE_ID_PREMIUM_1000
    : process.env.REACT_APP_STRIPE_LIVE_PRICE_ID_PREMIUM_1000,
  premium1750: process.env.REACT_APP_NODE_ENV === 'development'
    ? process.env.REACT_APP_STRIPE_TEST_PRICE_ID_PREMIUM_1750
    : process.env.REACT_APP_STRIPE_LIVE_PRICE_ID_PREMIUM_1750,
};

export default stripePriceIDs;
