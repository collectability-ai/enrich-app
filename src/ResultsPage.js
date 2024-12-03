import React from "react";
import { useLocation } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const ResultsPage = () => {
  const { state } = useLocation();
  const data = state?.data || {};

  console.log("Data Received in ResultsPage:", data);

  const renderAddress = (address) => {
    if (!address) return "N/A";
    return `${address.street}, ${address.city}, ${address.state} ${address.zip}`;
  };

  const handleSavePDF = async () => {
    const content = document.getElementById("resultsContent");

    // Use html2canvas to capture the content
    const canvas = await html2canvas(content, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");

    // Configure jsPDF
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Add Logo
    const logoUrl = `${window.location.origin}/logo.png`;
    pdf.addImage(logoUrl, "PNG", 10, 10, 50, 15); // Adjust dimensions as needed

    // Add content
    const imgWidth = pageWidth - 20; // Add some margins
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Center content and ensure it fits within page margins
    const x = 10;
    const y = 30; // Below the logo
    pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight > pageHeight - y ? pageHeight - y - 10 : imgHeight);

    const fileName = `${data.searchedPerson?.name || "User"} - Enrich and Validate.pdf`;
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
        backgroundColor: "#f9f9f9",
        borderRadius: "8px",
        boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
        overflow: "hidden",
      }}
    >
      <header style={{ textAlign: "center", marginBottom: "20px" }}>
        {/* Display Logo */}
        <img
          src="/logo-small.png"
          alt="Logo"
          style={{
            height: "50px",
            marginBottom: "10px",
          }}
        />
      </header>

      {/* Search Input Section */}
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "10px" }}>Search Input</h2>
        <p><strong>Name:</strong> {data.searchedPerson?.name || "N/A"}</p>
        <p><strong>Phone:</strong> {data.searchedPerson?.searchedPhone || "N/A"}</p>
        <p><strong>Email:</strong> {data.searchedPerson?.searchedEmail || "N/A"}</p>
        <p>
          <strong>Address:</strong> {renderAddress(data.searchedPerson?.searchedAddress)}
        </p>
      </div>

      {/* Primary Validated Info Section */}
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "10px" }}>Primary Validated Info</h2>
        <p><strong>Name:</strong> {data.primaryVerified?.name || "N/A"}</p>
        <p><strong>Phone:</strong> {data.primaryVerified?.phone || "N/A"}</p>
        <p><strong>Email:</strong> {data.primaryVerified?.email || "N/A"}</p>
        <p>
          <strong>Address:</strong> {renderAddress(data.primaryVerified?.address)}
        </p>
        <p><strong>First Seen:</strong> {data.primaryVerified?.firstSeen || "N/A"}</p>
        <p><strong>Last Seen:</strong> {data.primaryVerified?.lastSeen || "N/A"}</p>
        <p>
          <strong>Identity Confidence Score:</strong>{" "}
          {data.primaryVerified?.identityConfidenceScore || "N/A"}
        </p>
        <p><strong>Fraud Risk:</strong> {data.primaryVerified?.fraudRisk || "N/A"}</p>
      </div>

      {/* Enriched Data Section */}
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "10px" }}>Enriched Data</h2>

        {/* Phones */}
        {data.enrichedData?.phones?.length > 0 && (
          <>
            <h3 style={{ fontWeight: "bold", marginBottom: "5px" }}>Phones:</h3>
            <ul>
              {data.enrichedData.phones.map((phone, index) => (
                <li key={index} style={{ marginBottom: "5px" }}>
                  <strong>Number:</strong> {phone.number}, <strong>Type:</strong> {phone.type},{" "}
                  <strong>Connected:</strong> {phone.isConnected ? "Yes" : "No"},{" "}
                  <strong>First Reported:</strong> {phone.firstReportedDate},{" "}
                  <strong>Last Reported:</strong> {phone.lastReportedDate}
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Emails */}
        {data.enrichedData?.emails?.length > 0 && (
          <>
            <h3 style={{ fontWeight: "bold", marginBottom: "5px" }}>Emails:</h3>
            <ul>
              {data.enrichedData.emails.map((email, index) => (
                <li key={index} style={{ marginBottom: "5px" }}>
                  <strong>Address:</strong> {email.address},{" "}
                  <strong>Validated:</strong> {email.isValidated ? "Yes" : "No"},{" "}
                  <strong>Business:</strong> {email.isBusiness ? "Yes" : "No"}
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Addresses */}
        {data.enrichedData?.addresses?.length > 0 && (
          <>
            <h3 style={{ fontWeight: "bold", marginBottom: "5px" }}>Addresses:</h3>
            <ul>
              {data.enrichedData.addresses.map((address, index) => (
                <li key={index} style={{ marginBottom: "5px" }}>
                  {renderAddress(address)}
                  <br />
                  <strong>First Reported:</strong> {address.firstReportedDate},{" "}
                  <strong>Last Reported:</strong> {address.lastReportedDate}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Buttons Section */}
      <footer style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "20px" }}>
        <button
          onClick={handleSavePDF}
          style={{
            padding: "10px 20px",
            backgroundColor: "#007BFF",
            color: "white",
            border: "none",
            borderRadius: "4px",
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
            color: "white",
            border: "none",
            borderRadius: "4px",
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
