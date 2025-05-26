const formData = {
  nome,
  cognome,
  financingScope,
  importoRichiesto,
  cittaResidenza,
  provinciaResidenza,
  mail,
  telefono,
  privacyAccepted,
};

const endpoint = "/api/forms/aimedici"; // Updated endpoint for aimedici form

try {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  if (!response.ok) throw new Error("Errore nella richiesta");
  const result = await response.json();
  console.log("Dati inviati:", result);
  onFormSubmit();
  navigate("/thankyoupage");
} catch (error) {
  console.error("Errore:", error);
} 