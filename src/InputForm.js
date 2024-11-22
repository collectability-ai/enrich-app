import React, { useState } from "react";

const InputForm = ({ userEmail, navigateToPurchase }) => {
  const [formData, setFormData] = useState({
    FirstName: "",
    LastName: "",
    Email: "",
    Phone: "",
    Address: {
      street: "",
      city: "",
      state: "",
      zip: "",
    },
  });

  const [errorMessage, setErrorMessage] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData((prevState) => ({
        ...prevState,
        [parent]: { ...prevState[parent], [child]: value },
      }));
    } else {
      setFormData((prevState) => ({
        ...prevState,
        [name]: value,
      }));
    }
  };

  const validateForm = () => {
    const { FirstName, LastName, Email, Phone, Address } = formData;

    // Ensure first and last name are filled
    if (!FirstName.trim() || !LastName.trim()) {
      return "First Name and Last Name are required.";
    }

    // Ensure at least one of Email, Phone, or full Address is provided
    const hasEmailOrPhone = Email.trim() || Phone.trim();
    const hasFullAddress =
      Address.street.trim() &&
      Address.city.trim() &&
      Address.state.trim() &&
      Address.zip.trim();

    if (!hasEmailOrPhone && !hasFullAddress) {
      return "Please provide at least one of Email, Phone, or a complete Address.";
    }

    return null; // Validation passed
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(""); // Clear any previous error messages

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/use-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error.purchaseRequired) {
          setErrorMessage(errorData.error.message);
          navigateToPurchase(); // Redirect to purchase page
        } else {
          setErrorMessage(errorData.error.message);
        }
      } else {
        const data = await response.json();
        alert(`Search successful! Remaining credits: ${data.remainingCredits}`);
      }
    } catch (err) {
      console.error("Error during search:", err);
      setErrorMessage("An error occurred. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>First Name:</label>
        <input
          type="text"
          name="FirstName"
          value={formData.FirstName}
          onChange={handleInputChange}
          required
        />
      </div>
      <div>
        <label>Last Name:</label>
        <input
          type="text"
          name="LastName"
          value={formData.LastName}
          onChange={handleInputChange}
          required
        />
      </div>
      <div>
        <label>Email:</label>
        <input
          type="email"
          name="Email"
          value={formData.Email}
          onChange={handleInputChange}
        />
      </div>
      <div>
        <label>Phone:</label>
        <input
          type="tel"
          name="Phone"
          value={formData.Phone}
          onChange={handleInputChange}
        />
      </div>
      <div>
        <label>Street Address:</label>
        <input
          type="text"
          name="Address.street"
          value={formData.Address.street}
          onChange={handleInputChange}
        />
      </div>
      <div>
        <label>City:</label>
        <input
          type="text"
          name="Address.city"
          value={formData.Address.city}
          onChange={handleInputChange}
        />
      </div>
      <div>
        <label>State:</label>
        <input
          type="text"
          name="Address.state"
          value={formData.Address.state}
          onChange={handleInputChange}
        />
      </div>
      <div>
        <label>ZIP Code:</label>
        <input
          type="text"
          name="Address.zip"
          value={formData.Address.zip}
          onChange={handleInputChange}
        />
      </div>
      <button type="submit">Search</button>
      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
    </form>
  );
};

export default InputForm;
