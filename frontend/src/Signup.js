import React, { useState } from "react";
import logger from "./logger";
import { signUp } from "aws-amplify/auth";
import { useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";

// Log environment variables (only in development)
if (process.env.NODE_ENV !== "production") {
  logger.log("Signup.js Environment:", process.env.REACT_APP_ENVIRONMENT);
  logger.log("Signup.js Region:", process.env.REACT_APP_AWS_REGION);
  logger.log("Signup.js User Pool ID:", process.env.REACT_APP_COGNITO_USER_POOL_ID);
  logger.log("Signup.js User Pool Web Client ID:", process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID);
  logger.log("Signup.js Identity Pool ID:", process.env.REACT_APP_IDENTITY_POOL_ID);
  logger.log("Signup.js Auth Domain:", process.env.REACT_APP_COGNITO_AUTHORITY);
  logger.log("Signup.js Redirect URI:", process.env.REACT_APP_REDIRECT_URI);
  logger.log("Signup.js Cookie Domain:", process.env.REACT_APP_COOKIE_DOMAIN);
}

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
      const formattedPhone = formData.phone.startsWith("+")
        ? formData.phone
        : `+1${formData.phone.replace(/\D/g, "")}`;

      const signUpResult = await signUp({
        username: formData.email,
        password: formData.password,
        options: {
          userAttributes: {
            email: formData.email,
            phone_number: formattedPhone,
            name: formData.name,
            "custom:companyName": formData.companyName,
            "custom:companyWebsite": formData.companyWebsite,
            "custom:companyEIN": formData.companyEIN || "",
            "custom:useCase": formData.useCase,
          },
          autoSignIn: true,
        },
      });

      logger.log("Sign up success:", signUpResult);

      setSuccess(true);
      alert("Signup successful! Please check your email for verification code.");

      sessionStorage.setItem("pendingVerificationEmail", formData.email);

      setTimeout(() => {
        navigate("/verify");
      }, 2000);
    } catch (error) {
      logger.error("Signup error:", error);
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
            <img src="/logo.png" alt="Logo" className="h-12 mx-auto mb-4" />
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
            {/* Input Fields */}
            {[
              { name: "name", type: "text", label: "Name" },
              { name: "email", type: "email", label: "Email Address" },
              { name: "phone", type: "tel", label: "Phone Number" },
              { name: "password", type: "password", label: "Password" },
              { name: "companyName", type: "text", label: "Company Name" },
              { name: "companyWebsite", type: "text", label: "Company Website" },
              { name: "companyEIN", type: "text", label: "Company EIN (Optional)" },
            ].map((field) => (
              <div className="relative" key={field.name}>
                <input
                  type={field.type}
                  name={field.name}
                  value={formData[field.name]}
                  onChange={handleChange}
                  onFocus={() => setFocusedField(field.name)}
                  onBlur={() => setFocusedField("")}
                  required={field.name !== "companyEIN"}
                  className="w-full px-3 py-3 bg-white border rounded-md peer outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder=" "
                />
                <label
                  className={`absolute text-sm duration-150 transform -translate-y-3 top-0.5 left-3 peer-placeholder-shown:translate-y-3 peer-focus:-translate-y-3 peer-focus:text-blue-600 bg-white px-1 ${
                    focusedField === field.name || formData[field.name]
                      ? "text-blue-600 -translate-y-3"
                      : "text-gray-500"
                  }`}
                >
                  {field.label}
                </label>
              </div>
            ))}

            {/* Select Dropdown */}
            <div className="relative">
              <select
                name="useCase"
                value={formData.useCase}
                onChange={handleChange}
                onFocus={() => setFocusedField("useCase")}
                onBlur={() => setFocusedField("")}
                required
                className="w-full px-3 py-3 bg-white border rounded-md peer outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="">Select Use Case</option>
                <option value="Debt Collections">Debt Collections</option>
                <option value="Marketing">Marketing</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Fraud Prevention">Fraud Prevention</option>
                <option value="Identity Verification">Identity Verification</option>
              </select>
              <label
                className={`absolute text-sm duration-150 transform -translate-y-3 top-0.5 left-3 bg-white px-1 ${
                  focusedField === "useCase" || formData.useCase
                    ? "text-blue-600"
                    : "text-gray-500"
                }`}
              >
                Use Case
              </label>
            </div>

            {/* Terms and Conditions */}
            <div className="flex flex-col space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="termsAccepted"
                  checked={formData.termsAccepted}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  required
                />
                <label className="text-sm text-gray-700">
                  I accept the{" "}
                  <a
                    href="https://contactvalidate.com/terms/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    Terms and Conditions
                  </a>
                </label>
              </div>
              <p className="text-xs text-gray-600">
                The service does not constitute a “consumer reporting agency” as
                defined in the Fair Credit Reporting Act (“FCRA”), and the Data
                does not constitute “consumer reports” as defined in the FCRA.
                Accordingly, the Data may not be used as a factor in determining
                eligibility for credit, insurance, employment, or any other
                purpose under the FCRA.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-md text-white font-medium ${
                isLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-[#67cad8] hover:bg-[#5ab5c2] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#67cad8]"
              }`}
            >
              {isLoading ? "Signing Up..." : "Sign Up"}
            </button>
          </form>

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
    </div>
  );
};

export default Signup;
