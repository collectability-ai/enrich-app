import React from "react";

const ApiAccess = () => {
  return (
    <div className="flex justify-center items-center min-h-screen px-6">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-3xl lg:max-w-5xl">
        {/* Background Image */}
        <div className="w-full">
          <img 
            src="/matrix.png" 
            alt="API Matrix Background" 
            className="w-full rounded-t-lg"
          />
        </div>

        {/* Title and Message */}
        <div className="text-center py-6">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-800">API Developer Portal</h1>
          <p className="text-lg text-gray-600 mt-4">
            Coming soon. Email us at{" "}
            <a href="mailto:support@contactvalidate.com" className="text-blue-600 underline">
              support@contactvalidate.com
            </a>{" "}
            if you are interested in early access.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ApiAccess;
