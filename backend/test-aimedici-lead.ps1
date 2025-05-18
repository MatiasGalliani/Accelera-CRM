# PowerShell script to submit a test lead to the API for AImedici
# This simulates a form submission from AImedici.it

# Format current timestamp for unique email
$timestamp = Get-Date -Format "yyyyMMddHHmmss"

# Create the lead data payload
$leadData = @{
    source = "aimedici"
    firstName = "Giovanni"
    lastName = "Bianchi"
    email = "test-aimedici-$timestamp@example.com"
    phone = "3331234567"
    message = "Vorrei prenotare una visita specialistica per un problema cardiologico."
    scopoRichiesta = "Consulenza specialistica cardiologica"
    importoRichiesto = "175"
    cittaResidenza = "Roma"
    provinciaResidenza = "RM"
    privacyAccettata = $true
}

# Convert payload to JSON
$jsonPayload = $leadData | ConvertTo-Json

# Show what we're sending
Write-Host "Sending test lead to AImedici with the following data:"
Write-Host $jsonPayload -ForegroundColor Cyan
Write-Host ""

# Send POST request to the API
try {
    $response = Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/leads/webhook" `
        -Headers @{
            "Content-Type" = "application/json"
            "X-API-Key" = "dev-api-key-123"
        } `
        -Body $jsonPayload `
        -ErrorAction Stop

    # Print success message
    Write-Host "✅ Lead successfully submitted!" -ForegroundColor Green
    Write-Host "Response from server:" -ForegroundColor Green
    $response | ConvertTo-Json | Write-Host -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Lead ID: $($response.leadId)" -ForegroundColor Yellow
    Write-Host "Source: $($response.source)" -ForegroundColor Yellow
    Write-Host "Assigned to agent ID: $($response.assignedAgentId)" -ForegroundColor Yellow
    
} catch {
    # Print error message
    Write-Host "❌ Error submitting lead" -ForegroundColor Red
    Write-Host "Error details: $_" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Server response: $responseBody" -ForegroundColor Red
    }
} 