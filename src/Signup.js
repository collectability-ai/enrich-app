import React, { useState } from "react";
import { signUp } from 'aws-amplify/auth';
import { useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";

const Signup = () => {
  const navigate = useNavigate();
  const [focusedField, setFocusedField] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    companyWebsite: "",
    companyEIN: "",
    useCase: "",
    termsAccepted: false,
    password: "",
  });

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.termsAccepted) {
      setError("You must accept the Terms and Conditions to proceed.");
      return;
    }

    const passwordRequirements = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRequirements.test(formData.password)) {
      setError(
        "Password must be at least 8 characters long, include one uppercase letter and one number."
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formattedPhone = formData.phone.startsWith('+') 
        ? formData.phone 
        : `+1${formData.phone.replace(/\D/g, '')}`;

      const signUpResult = await signUp({
  username: formData.email,
  password: formData.password,
  options: {
    userAttributes: {
      email: formData.email,
      phone_number: formattedPhone,
      name: formData.name,
      'custom:companyName': formData.companyName,
      'custom:companyWebsite': formData.companyWebsite,
      'custom:companyEIN': formData.companyEIN || '',
      'custom:useCase': formData.useCase
    },
    autoSignIn: true
  },
  authority: process.env.REACT_APP_COGNITO_AUTHORITY,
  clientId: process.env.REACT_APP_COGNITO_APP_CLIENT_ID
      });

      console.log('Sign up success:', signUpResult);
      
      setSuccess(true);
      alert("Signup successful! Please check your email for verification code.");
      
      sessionStorage.setItem('pendingVerificationEmail', formData.email);
      
      setTimeout(() => {
        navigate("/verify");
      }, 2000);

    } catch (error) {
      console.error("Signup error:", error);
      setError(error.message || "An error occurred during signup.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex justify-center pt-8">
      <div className="w-[600px] rounded-lg overflow-hidden shadow-lg bg-white">
        <div className="pb-4 px-6 pt-6">
          <div className="text-center mb-6">
            <img
              src="/logo.png"
              alt="Logo"
              className="h-12 mx-auto mb-4"
            />
            <h2 className="text-2xl font-bold">Sign Up</h2>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <p>{error}</p>
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-md">
              Signup successful! Redirecting to verification...
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onFocus={() => setFocusedField("name")}
                onBlur={() => setFocusedField("")}
                required
                className="w-full px-3 py-3 bg-white border rounded-md peer outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder=" "
              />
              <label
                className={`absolute text-sm duration-150 transform -translate-y-3 top-0.5 left-3 peer-placeholder-shown:translate-y-3 
                  peer-focus:-translate-y-3 peer-focus:text-blue-600 bg-white px-1
                  ${focusedField === "name" || formData.name ? 'text-blue-600 -translate-y-3' : 'text-gray-500'}
                  after:content-["*"] after:ml-0.5 after:text-red-500`}
              >
                Name
              </label>
            </div>

            <div className="relative">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField("")}
                required
                className="w-full px-3 py-3 bg-white border rounded-md peer outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder=" "
              />
              <label
                className={`absolute text-sm duration-150 transform -translate-y-3 top-0.5 left-3 peer-placeholder-shown:translate-y-3 
                  peer-focus:-translate-y-3 peer-focus:text-blue-600 bg-white px-1
                  ${focusedField === "email" || formData.email ? 'text-blue-600 -translate-y-3' : 'text-gray-500'}
                  after:content-["*"] after:ml-0.5 after:text-red-500`}
              >
                Email Address
              </label>
            </div>

            <div className="relative">
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                onFocus={() => setFocusedField("phone")}
                onBlur={() => setFocusedField("")}
                required
                className="w-full px-3 py-3 bg-white border rounded-md peer outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder=" "
              />
              <label
                className={`absolute text-sm duration-150 transform -translate-y-3 top-0.5 left-3 peer-placeholder-shown:translate-y-3 
                  peer-focus:-translate-y-3 peer-focus:text-blue-600 bg-white px-1
                  ${focusedField === "phone" || formData.phone ? 'text-blue-600 -translate-y-3' : 'text-gray-500'}
                  after:content-["*"] after:ml-0.5 after:text-red-500`}
              >
                Phone Number
              </label>
            </div>

            <div className="relative">
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField("")}
                required
                className="w-full px-3 py-3 bg-white border rounded-md peer outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder=" "
              />
              <label
                className={`absolute text-sm duration-150 transform -translate-y-3 top-0.5 left-3 peer-placeholder-shown:translate-y-3 
                  peer-focus:-translate-y-3 peer-focus:text-blue-600 bg-white px-1
                  ${focusedField === "password" || formData.password ? 'text-blue-600 -translate-y-3' : 'text-gray-500'}
                  after:content-["*"] after:ml-0.5 after:text-red-500`}
              >
                Password
              </label>
            </div>

            <div className="relative">
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                onFocus={() => setFocusedField("companyName")}
                onBlur={() => setFocusedField("")}
                required
                className="w-full px-3 py-3 bg-white border rounded-md peer outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder=" "
              />
              <label
                className={`absolute text-sm duration-150 transform -translate-y-3 top-0.5 left-3 peer-placeholder-shown:translate-y-3 
                  peer-focus:-translate-y-3 peer-focus:text-blue-600 bg-white px-1
                  ${focusedField === "companyName" || formData.companyName ? 'text-blue-600 -translate-y-3' : 'text-gray-500'}
                  after:content-["*"] after:ml-0.5 after:text-red-500`}
              >
                Company Name
              </label>
            </div>

            <div className="relative">
              <input
                type="text"
                name="companyWebsite"
                value={formData.companyWebsite}
                onChange={handleChange}
                onFocus={() => setFocusedField("companyWebsite")}
                onBlur={() => setFocusedField("")}
                required
                className="w-full px-3 py-3 bg-white border rounded-md peer outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder=" "
              />
              <label
                className={`absolute text-sm duration-150 transform -translate-y-3 top-0.5 left-3 peer-placeholder-shown:translate-y-3 
                  peer-focus:-translate-y-3 peer-focus:text-blue-600 bg-white px-1
                  ${focusedField === "companyWebsite" || formData.companyWebsite ? 'text-blue-600 -translate-y-3' : 'text-gray-500'}
                  after:content-["*"] after:ml-0.5 after:text-red-500`}
              >
                Company Website
              </label>
            </div>

            <div className="relative">
              <input
                type="text"
                name="companyEIN"
                value={formData.companyEIN}
                onChange={handleChange}
                onFocus={() => setFocusedField("companyEIN")}
                onBlur={() => setFocusedField("")}
                className="w-full px-3 py-3 bg-white border rounded-md peer outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder=" "
              />
              <label
                className={`absolute text-sm duration-150 transform -translate-y-3 top-0.5 left-3 peer-placeholder-shown:translate-y-3 
                  peer-focus:-translate-y-3 peer-focus:text-blue-600 bg-white px-1
                  ${focusedField === "companyEIN" || formData.companyEIN ? 'text-blue-600 -translate-y-3' : 'text-gray-500'}`}
              >
                Company EIN (Optional)
              </label>
            </div>

            <div className="relative">
              <select
                name="useCase"
                value={formData.useCase}
                onChange={handleChange}
                onFocus={() => setFocusedField("useCase")}
                onBlur={() => setFocusedField("")}
                required
                className="w-full px-3 py-3 bg-white border rounded-md peer outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                placeholder=" "
              >
                <option value="">Select Use Case</option>
                <option value="Debt Collections">Debt Collections</option>
                <option value="Marketing">Marketing</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Fraud Prevention">Fraud Prevention</option>
                <option value="Identity Verification">Identity Verification</option>
              </select>
              <label
                className={`absolute text-sm duration-150 transform -translate-y-3 top-0.5 left-3 bg-white px-1
                  ${focusedField === "useCase" || formData.useCase ? 'text-blue-600' : 'text-gray-500'}
                  after:content-["*"] after:ml-0.5 after:text-red-500`}
              >
                Use Case
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="termsAccepted"
                checked={formData.termsAccepted}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="text-sm text-gray-700">
                I accept the Terms and Conditions
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-md text-white font-medium
                ${isLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-[#67cad8] hover:bg-[#5ab5c2] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#67cad8]"
                }`}
            >
              {isLoading ? "Signing Up..." : "Sign Up"}
            </button>
          </form>
        </div>

        <div className="text-center mt-6 mb-6">
          <p className="text-sm text-gray-600 mb-2">Already a user?</p>
          <button
            onClick={() => navigate("/login")}
            className="text-[#67cad8] hover:text-[#5ab5c2] font-medium"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

export default Signup;