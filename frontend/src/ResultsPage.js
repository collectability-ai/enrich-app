import React from "react";
import { useLocation } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const ResultsPage = () => {
  const { state } = useLocation();
  const data = state?.data || {};

  // Render a formatted address, leaving blank fields empty
const renderAddress = (address) => {
  if (!address) return "";

  // Check if all fields are empty
  const { street = "", city = "", state = "", zip = "" } = address;
  if (!street && !city && !state && !zip) {
    return ""; // Return an empty string if all fields are blank
  }

  // Return formatted address
  return `${street}${city ? `, ${city}` : ""}${state ? `, ${state}` : ""}${zip ? ` ${zip}` : ""}`;
};

// Render a single value, leaving it blank if undefined or null
const renderValue = (value) => {
  return value || "";
};

const handleSavePDF = async () => {
  const { searchedPerson } = data;

  // Extract name for the file
  const firstName = searchedPerson?.name?.split(" ")[0] || "User";
  const lastName = searchedPerson?.name?.split(" ")[1] || "";
  const fileName = `${firstName} ${lastName} - EnrichAndValidate Result.pdf`;

  const content = document.getElementById("resultsContent");

  // Hide buttons before rendering
  const buttons = document.querySelectorAll("button");
  buttons.forEach((button) => (button.style.display = "none"));

  // Capture the content with html2canvas
  const canvas = await html2canvas(content, {
    scale: 2,
    useCORS: true,
  });

  // Restore buttons
  buttons.forEach((button) => (button.style.display = ""));

  const imgData = canvas.toDataURL("image/png");

  // Configure jsPDF
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pageWidth - 20;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let y = 10;
  pdf.addImage(imgData, "PNG", 10, y, imgWidth, imgHeight);

  // Save the PDF
  pdf.save(fileName);
};

  return (
    <div
      id="resultsContent"
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        fontFamily: "Arial, sans-serif",
        padding: "20px",
        backgroundColor: "#ffffff",
        border: "1px solid #ddd",
        borderRadius: "8px",
      }}
    >
      {/* Header */}
      <header style={{ textAlign: "center", marginBottom: "20px" }}>
        <img
          src="/logo.png"
          alt="Logo"
          style={{
            height: "50px",
          }}
        />
        <h1 style={{ fontSize: "20px", fontWeight: "bold" }}>Enrich and Validate</h1>
      </header>

      {/* Search Input Section */}
<div
  style={{
    marginBottom: "20px",
    padding: "15px",
    backgroundColor: "#f9f9f9",
    border: "1px solid #ddd",
    borderRadius: "8px",
  }}
>
  <h2 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "10px" }}>Search Input</h2>
  <table
    style={{
      width: "100%",
      borderCollapse: "collapse",
      fontSize: "14px",
    }}
  >
    <tbody>
      <tr>
  <td style={{ border: "1px solid #ddd", padding: "8px", fontWeight: "bold" }}>Name:</td>
  <td style={{ border: "1px solid #ddd", padding: "8px" }}>{renderValue(data.searchedPerson?.name)}</td>
</tr>
<tr>
  <td style={{ border: "1px solid #ddd", padding: "8px", fontWeight: "bold" }}>Phone:</td>
  <td style={{ border: "1px solid #ddd", padding: "8px" }}>{renderValue(data.searchedPerson?.searchedPhone)}</td>
</tr>
<tr>
  <td style={{ border: "1px solid #ddd", padding: "8px", fontWeight: "bold" }}>Email:</td>
  <td style={{ border: "1px solid #ddd", padding: "8px" }}>{renderValue(data.searchedPerson?.searchedEmail)}</td>
</tr>
<tr>
  <td style={{ border: "1px solid #ddd", padding: "8px", fontWeight: "bold" }}>Address:</td>
  <td style={{ border: "1px solid #ddd", padding: "8px" }}>{renderAddress(data.searchedPerson?.searchedAddress)}</td>
</tr>
    </tbody>
  </table>
</div>


      {/* Primary Validated Info */}
     <div
  style={{
    marginBottom: "20px",
    padding: "15px",
    backgroundColor: "#f9f9f9",
    border: "1px solid #ddd",
    borderRadius: "8px",
  }}
>
  <h2 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "10px" }}>
    Primary Validated Info
  </h2>
  <table
    style={{
      width: "100%",
      borderCollapse: "collapse",
      fontSize: "14px",
    }}
  >
    <tbody>
      <tr>
        <td style={{ border: "1px solid #ddd", padding: "8px", fontWeight: "bold" }}>Name:</td>
        <td style={{ border: "1px solid #ddd", padding: "8px" }}>{data.primaryVerified?.name || "N/A"}</td>
      </tr>
      <tr>
        <td style={{ border: "1px solid #ddd", padding: "8px", fontWeight: "bold" }}>Phone:</td>
        <td style={{ border: "1px solid #ddd", padding: "8px" }}>{data.primaryVerified?.phone || "N/A"}</td>
      </tr>
      <tr>
        <td style={{ border: "1px solid #ddd", padding: "8px", fontWeight: "bold" }}>Email:</td>
        <td style={{ border: "1px solid #ddd", padding: "8px" }}>{data.primaryVerified?.email || "N/A"}</td>
      </tr>
      <tr>
        <td style={{ border: "1px solid #ddd", padding: "8px", fontWeight: "bold" }}>Address:</td>
        <td style={{ border: "1px solid #ddd", padding: "8px" }}>
          {renderAddress(data.primaryVerified?.address)}
        </td>
      </tr>
      <tr>
        <td style={{ border: "1px solid #ddd", padding: "8px", fontWeight: "bold" }}>First Seen:</td>
        <td style={{ border: "1px solid #ddd", padding: "8px" }}>{data.primaryVerified?.firstSeen || "N/A"}</td>
      </tr>
      <tr>
        <td style={{ border: "1px solid #ddd", padding: "8px", fontWeight: "bold" }}>Last Seen:</td>
        <td style={{ border: "1px solid #ddd", padding: "8px" }}>{data.primaryVerified?.lastSeen || "N/A"}</td>
      </tr>
      <tr>
        <td style={{ border: "1px solid #ddd", padding: "8px", fontWeight: "bold" }}>Identity Confidence Score:</td>
        <td style={{ border: "1px solid #ddd", padding: "8px" }}>{data.primaryVerified?.identityConfidenceScore || "N/A"}</td>
      </tr>
      <tr>
        <td style={{ border: "1px solid #ddd", padding: "8px", fontWeight: "bold" }}>Fraud Risk:</td>
        <td style={{ border: "1px solid #ddd", padding: "8px" }}>{data.primaryVerified?.fraudRisk || "N/A"}</td>
      </tr>
    </tbody>
  </table>
</div>

    {/* Enriched Data Section */}
<div
  style={{
    marginBottom: "20px",
    padding: "15px",
    backgroundColor: "#f9f9f9",
    border: "1px solid #ddd",
    borderRadius: "8px",
  }}
>
  <h2 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "10px" }}>Enriched Data</h2>

  {/* Phones */}
  {data.enrichedData?.phones?.length > 0 && (
    <div style={{ marginBottom: "15px" }}>
      <h3 style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px" }}>Phones</h3>
      <ul style={{ marginLeft: "20px", fontSize: "12px", lineHeight: "1.4" }}>
        {data.enrichedData.phones.map((phone, index) => (
          <li key={index}>
            <strong>Number:</strong> {phone.number}, <strong>Type:</strong> {phone.type},{" "}
            <strong>Connected:</strong> {phone.isConnected ? "Yes" : "No"},{" "}
            <strong>First Reported:</strong> {phone.firstReportedDate},{" "}
            <strong>Last Reported:</strong> {phone.lastReportedDate}
          </li>
        ))}
      </ul>
    </div>
  )}

  {/* Emails */}
  {data.enrichedData?.emails?.length > 0 && (
    <div style={{ marginBottom: "15px" }}>
      <h3 style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px" }}>Emails</h3>
      <ul style={{ marginLeft: "20px", fontSize: "12px", lineHeight: "1.4" }}>
        {data.enrichedData.emails.map((email, index) => (
          <li key={index}>
            <strong>Address:</strong> {email.address}, <strong>Validated:</strong>{" "}
            {email.isValidated ? "Yes" : "No"}, <strong>Business:</strong>{" "}
            {email.isBusiness ? "Yes" : "No"}
          </li>
        ))}
      </ul>
    </div>
  )}

  {/* Addresses */}
  {data.enrichedData?.addresses?.length > 0 && (
    <div style={{ marginBottom: "15px" }}>
      <h3 style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px" }}>Addresses</h3>
      <ul style={{ marginLeft: "20px", fontSize: "12px", lineHeight: "1.4" }}>
        {data.enrichedData.addresses.map((address, index) => (
          <li key={index}>
            {renderAddress(address)}
            <br />
            <strong>First Reported:</strong> {address.firstReportedDate},{" "}
            <strong>Last Reported:</strong> {address.lastReportedDate}
          </li>
        ))}
      </ul>
    </div>
  )}
</div>


      {/* Buttons */}
      <footer style={{ textAlign: "center", marginTop: "20px" }}>
        <button
          onClick={handleSavePDF}
          style={{
            marginRight: "10px",
            padding: "10px 20px",
            backgroundColor: "#007BFF",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Save as PDF
        </button>
        <button
          onClick={() => window.history.back()}
          style={{
            padding: "10px 20px",
            backgroundColor: "#6c757d",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Go Back
        </button>
      </footer>
    </div>
  );
};

export default ResultsPage;
