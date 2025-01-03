import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import axios from "axios";
import { Card, CardHeader, CardTitle, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "./components/ui/alert";

const InputForm = ({ userEmail }) => {
  const [searchQuery, setSearchQuery] = useState({
    firstName: "",
    lastName: "",
    addressLine1: "",
    city: "",
    state: "",
    zip: "",
    email: "",
    phone: "",
    operation: "validate_and_enrich",
  });
  const [focusedField, setFocusedField] = useState("");
  const [error, setError] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [remainingCredits, setRemainingCredits] = useState(null);
  const [responseData, setResponseData] = useState(null);

  const inputFields = [
    { name: "firstName", label: "First Name", required: true },
    { name: "lastName", label: "Last Name", required: true },
    { name: "addressLine1", label: "Address Line 1" },
    { name: "city", label: "City" },
    { name: "state", label: "State" },
    { name: "zip", label: "ZIP Code" },
    { name: "email", label: "Email", type: "email" },
    { name: "phone", label: "Phone", type: "tel" },
  ];

const CREDIT_COSTS = {
  validate: 2,
  enrich: 2,
  validate_and_enrich: 3
};

const OPERATION_LABELS = {
  validate: "Validate",
  enrich: "Enrich",
  validate_and_enrich: "Validate and Enrich"
};

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchQuery((prev) => ({ ...prev, [name]: value }));
  };

  const handleConfirm = async () => {
    setShowDialog(false);
    setIsLoading(true);
    setError(null);

    const fullName = `${searchQuery.firstName} ${searchQuery.lastName}`.trim();
    
    const formattedQuery = {
      ...searchQuery,
      nameAddresses: [{
        address: {
          line1: searchQuery.addressLine1 || "",
          city: searchQuery.city || "",
          region: searchQuery.state || "",
          postalCode: searchQuery.zip || "",
          countryCode: "US"
        },
        fullName: fullName
      }],
      emailAddresses: [searchQuery.email || ""],
      phoneNumbers: [searchQuery.phone ? searchQuery.phone.replace(/\D/g, '') : ""],
    };

    try {
      const response = await axios.post(
  `${process.env.REACT_APP_API_BASE_URL}/use-search`,
  {
    email: userEmail,
    searchQuery: formattedQuery,
  }
);

      if (response.data?.data) {
        setResponseData(response.data.data);
        setRemainingCredits(response.data.remainingCredits);
        setShowSuccessModal(true);
      } else {
        setError("Invalid response format from server");
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || "Search failed");
    } finally {
      setIsLoading(false);
    }
  };

return (
    <div className="w-full flex justify-center pt-8">
  <Card className="w-[600px] rounded-lg overflow-hidden shadow-lg bg-white">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold text-center">Contact Search</CardTitle>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={(e) => { e.preventDefault(); setShowDialog(true); }} className="space-y-4">
            {inputFields.map(({ name, label, type = "text", required }) => (
              <div key={name} className="relative">
                <input
                  type={type}
                  name={name}
                  value={searchQuery[name]}
                  onChange={handleInputChange}
                  onFocus={() => setFocusedField(name)}
                  onBlur={() => setFocusedField("")}
                  required={required}
                  className="w-full px-3 py-3 bg-white border rounded-md peer outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder=" "
                />
                <label
                  className={`absolute text-sm duration-150 transform -translate-y-3 top-0.5 left-3 peer-placeholder-shown:translate-y-3 
                    peer-focus:-translate-y-3 peer-focus:text-blue-600 bg-white px-1
                    ${focusedField === name || searchQuery[name] ? 'text-blue-600 -translate-y-3' : 'text-gray-500'}
                    ${required ? 'after:content-["*"] after:ml-0.5 after:text-red-500' : ''}`}
                >
                  {label}
                </label>
              </div>
            ))}

            <div className="relative">
              <select
                name="operation"
                value={searchQuery.operation}
                onChange={handleInputChange}
                className="w-full px-3 py-3 bg-white border rounded-md outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer"
              >
                <option value="validate">Validate</option>
                <option value="enrich">Enrich</option>
                <option value="validate_and_enrich">Validate and Enrich</option>
              </select>
              <label className="absolute text-sm text-blue-600 duration-150 transform -translate-y-3 top-0.5 left-3 bg-white px-1">
                Search Type
              </label>
              <ChevronDown className="absolute right-3 top-3.5 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>

            <Button 
  type="submit" 
  className="w-full bg-[#1e2742] hover:bg-[#161d35] text-white mt-6"
>
  Submit Search
</Button>
          </form>
        </CardContent>
      </Card>

      {/* Modals remain the same */}
      {showDialog && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
      <h3 className="text-xl font-semibold mb-4 text-gray-900">Confirm Search</h3>
      <p className="mb-6 text-gray-700 text-lg">
        You are about to run a <span className="font-bold">{OPERATION_LABELS[searchQuery.operation]}</span> search for <span className="font-bold">{CREDIT_COSTS[searchQuery.operation]}</span> credits.
      </p>
      <div className="flex justify-end space-x-4">
        <Button 
          variant="outline" 
          onClick={() => setShowDialog(false)}
          className="px-4 py-2 text-gray-700 bg-white hover:bg-gray-50 border border-gray-300"
        >
          Cancel
        </Button>
        <Button 
          onClick={handleConfirm}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          Confirm
        </Button>
      </div>
    </div>
  </div>
)}

      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg max-w-sm w-full mx-4 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-700">Processing your request...</p>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Search Successful</h3>
            <p className="mb-6">
              You have <strong>{remainingCredits}</strong> credits remaining.
            </p>
            <Button 
              onClick={() => {
                setShowSuccessModal(false);
                navigate("/results", { state: { data: responseData } });
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              View Results
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InputForm;