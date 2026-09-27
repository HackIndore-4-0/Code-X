Challenge 1: Automated Threat Mitigation Pipeline Build an automated mitigation pipeline 
within the FastAPI backend that triggers external webhooks when a correlated incident's "Threat 
Weight" exceeds a configurable threshold. The system must generate a JSON payload 
containing the incident graph summary (nodes, user ID, flagged IP) and simulate isolating the 
compromised entity, while logging the mitigation action in the SQLite database. 
Expected Outcome: 
● A working backend function that evaluates real-time threat scores and dispatches a 
structured JSON payload to a mock remediation service. 
● Database records of all automated mitigation actions to maintain analyst auditability. 
● A demonstration showing the system successfully isolating a simulated high-risk entity 
(e.g., blocking an IP or suspending a user) without manual intervention.