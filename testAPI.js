const testPaymentMethodsAPI = async () => {
  try {
    const response = await fetch("http://localhost:5000/get-payment-methods", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer eyJraWQiOiJLSGhmRjc0dVwvNXdOQ1BqZGUxZXlpOGFuaW9IcFh0dkVMamM1dFJ2ZnFcL1E9IiwiYWxnIjoiUlMyNTYifQ.eyJhdF9oYXNoIjoiQ0VYd2VrOTZ3WVBXREVLOTBlaFpOQSIsInN1YiI6ImUxZWJmNTcwLTgwNTEtNzBjMy0wYWNiLWY2ZGQ0ODQyNjdiOCIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0yLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMl9FSHo3eFdOYm0iLCJjb2duaXRvOnVzZXJuYW1lIjoiZTFlYmY1NzAtODA1MS03MGMzLTBhY2ItZjZkZDQ4NDI2N2I4Iiwib3JpZ2luX2p0aSI6ImUwMzRjZjZhLTFlMzQtNDRiNC05ZGI0LWY4ODNkMWUwMzZlNSIsImF1ZCI6IjY0aXFkdWg4MmU2dHZkNW9ybGtuN3JrdGM4IiwiZXZlbnRfaWQiOiI4YjYyYjQ5ZC0wMTk2LTQwY2QtYjI5Zi0yMWNkZWRiMWMzYjkiLCJ0b2tlbl91c2UiOiJpZCIsImF1dGhfdGltZSI6MTczMzI2NTkxOSwiZXhwIjoxNzMzMjczMDY0LCJpYXQiOjE3MzMyNjk0NjQsImp0aSI6ImMwYjg1MzU2LTM4Y2UtNDFlZi1iNTU0LWE2MDJhMGNkMDNhYiIsImVtYWlsIjoiczF0cmFuc2l0aW9uY29udGFjdEBnbWFpbC5jb20ifQ.vbh2XFIJkGSjZTUyyvzIH3rVYs06jQ03zUjauLxKIalpjndyVn6Tft28w3m8Ri_xf8_ryhjCY4xboUR0cCWeP1dsPVHNwm5CQqUuEXZYp0M66Cnm3m-pRswO5AIMksMlBRk7ojAJITD6VbTS_7UBjFtumLKB8uI1bC4LJQ7kZRrzm_6OO0vDaf7D1f7PD76ZuasEm1CDzMw3lf24ENerL01EyuArtgMpy00f05a-gqpxA7VfjqliZGAaXr2bR29Qwlc25BfLBWvLfUlDboJj4AqV3m6OLBYpcOR8r3Oo__EQ9g7aKbQZGQK_-oEXpFlKpwpV_ce0H8UKTy4dbacIbA`, // Use your actual token here
      },
      body: JSON.stringify({ email: "s1transitioncontact@gmail.com" }),
    });

    const data = await response.json();
    console.log("Test API Response:", data);
  } catch (err) {
    console.error("Test API Error:", err.message);
  }
};

testPaymentMethodsAPI();
