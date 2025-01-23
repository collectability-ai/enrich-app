import React, { useState, useEffect } from 'react';
import logger from './logger';
import { useStripe, useElements } from '@stripe/react-stripe-js';

const PaymentMethods = ({ userEmail }) => {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const stripe = useStripe();
  
  const fetchPaymentMethods = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/get-payment-methods`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ email: userEmail }),
});


      if (!response.ok) {
        throw new Error('Failed to fetch payment methods');
      }

      const data = await response.json();
      setPaymentMethods(data.paymentMethods || []);
    } catch (err) {
      setError('Unable to load payment methods');
      logger.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, [userEmail]);

  const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/create-setup-intent`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ email: userEmail }),
});

      const { clientSecret } = await response.json();

      const { error } = await stripe.confirmSetup({
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard`,
          payment_method_data: {
            billing_details: {
              email: userEmail,
            },
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSetDefault = async (paymentMethodId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/set-default-payment`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ 
    email: userEmail,
    paymentMethodId 
  }),
});

      if (!response.ok) {
        throw new Error('Failed to set default payment method');
      }

      fetchPaymentMethods();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (paymentMethodId) => {
    if (!window.confirm('Are you sure you want to remove this payment method?')) {
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/delete-payment-method`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ 
    email: userEmail,
    paymentMethodId 
  }),
});


      if (!response.ok) {
        throw new Error('Failed to delete payment method');
      }

      fetchPaymentMethods();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Payment Methods</h2>
        {paymentMethods.length < 2 && (
          <button
            onClick={handleAddPaymentMethod}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
            disabled={loading}
          >
            Add Payment Method
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-4">Loading...</div>
      ) : paymentMethods.length === 0 ? (
        <div className="text-center py-4 text-gray-600">
          No payment methods available. Add one to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {paymentMethods.map((method) => (
            <div 
              key={method.id}
              className="border rounded-lg p-4 flex justify-between items-center"
            >
              <div className="flex items-center space-x-4">
                <div className="text-gray-600">
                  {method.brand.charAt(0).toUpperCase() + method.brand.slice(1)} •••• {method.last4}
                  <br />
                  <span className="text-sm text-gray-500">
                    Expires {method.exp_month}/{method.exp_year}
                  </span>
                </div>
              </div>
              
              <div className="flex space-x-2">
                {!method.isDefault && (
                  <button
                    onClick={() => handleSetDefault(method.id)}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded transition-colors text-sm"
                  >
                    Set Default
                  </button>
                )}
                {method.isDefault && (
                  <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded text-sm">
                    Default
                  </span>
                )}
                <button
  onClick={() => handleDelete(method.id, {    // NEW VERSION
    brand: method.brand,
    last4: method.last4
  })}
  className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
>
  Remove
</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PaymentMethods;