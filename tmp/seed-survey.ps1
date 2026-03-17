$body = @{
    projectCode = "OPI-TECH-24"
    countryCode = "US"
    surveyUrl = "https://survey.example.com/test?uid={RID}&pid=OPI-TECH-24"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:3001/api/debug/country-surveys" -Method POST -Body $body -ContentType "application/json"
Write-Output $response.Content
