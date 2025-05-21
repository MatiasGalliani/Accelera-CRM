// testApi.js
console.log('Backend is ready to accept leads from the frontend form');
console.log('The following endpoints have been added:');
console.log();
console.log('1. POST /api/forms/pensionato');
console.log('   Accepts data for "pensionato" leads');
console.log();
console.log('   Example payload:');
console.log(`   {
     "nome": "Mario",
     "cognome": "Rossi",
     "mail": "mario.rossi@example.com",
     "telefono": "123456789",
     "birthDate": "1960-01-01",
     "province": "MI",
     "privacyAccepted": true,
     "pensionAmount": "1500",
     "pensioneNetta": "1000",
     "entePensionistico": "italiana",
     "pensioneType": "Vecchiaia"
   }`);
console.log();
console.log('2. POST /api/forms/dipendente');
console.log('   Accepts data for "dipendente" leads');
console.log();
console.log('   Example payload:');
console.log(`   {
     "nome": "Luigi",
     "cognome": "Verdi",
     "mail": "luigi.verdi@example.com",
     "telefono": "987654321",
     "birthDate": "1985-05-15",
     "province": "RM",
     "privacyAccepted": true,
     "amountRequested": "10000", 
     "netSalary": "2000",
     "depType": "Privato",
     "secondarySelection": "SPA",
     "contractType": "indeterminato",
     "employmentDate": "01/2020",
     "numEmployees": "10"
   }`);
console.log();
console.log('These endpoints transform the data into the format expected by the lead service');
console.log('and create new leads in the database. The leads are then assigned to agents');
console.log('using the round-robin system.');
console.log();
console.log('CORS is properly configured to accept requests from:');
console.log('- http://localhost:5173');
console.log('- http://localhost:3000');
console.log('- https://accelera-crm.vercel.app');
console.log('- *.vercel.app domains'); 