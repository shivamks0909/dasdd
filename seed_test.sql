-- Cleanup old test data
DELETE FROM respondents WHERE project_code = 'TEST001';
DELETE FROM country_surveys WHERE project_code = 'TEST001';
DELETE FROM projects WHERE project_code = 'TEST001';
DELETE FROM suppliers WHERE code = 'TESTSUP';

-- Create test project
INSERT INTO projects (
  project_code, project_name, client, status,
  rid_prefix, rid_country_code, rid_padding, rid_counter
) VALUES (
  'TEST001', 'Test Project', 'ExploreResearch', 'active',
  'TSTR', 'IN', 4, 0
);

-- Add country survey
INSERT INTO country_surveys (
  project_id, project_code, country_code, survey_url, status
) 
SELECT id, 'TEST001', 'IN', 'https://track.exploresearch.in/start/MTkxNkAyOA==?uid={RID}', 'active'
FROM projects WHERE project_code = 'TEST001';

-- Create test supplier
INSERT INTO suppliers (
  name, code, complete_url, terminate_url, quotafull_url, security_url
) VALUES (
  'Test Supplier', 'TESTSUP',
  'https://example.com/complete?uid={uid}&pid={pid}',
  'https://example.com/terminate?uid={uid}&pid={pid}',
  'https://example.com/quotafull?uid={uid}&pid={pid}',
  'https://example.com/security?uid={uid}&pid={pid}'
);
