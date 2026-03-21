
import { RouterService } from './server/lib/router-service.js';
import { type Respondent, type Supplier, type Project } from './shared/schema.js';

async function test() {
  const router = new RouterService();
  
  const mockRespondent: any = {
    id: 'res-123',
    oiSession: 'session-456',
    supplierRid: 'SUP-RID-001',
    projectCode: 'PROJ-XYZ',
    supplierCode: 'CINT',
    extraParams: {
      age: '30',
      gender: 'female',
      custom_id: 'CUST-99'
    }
  };
  
  const mockSupplier: any = {
    code: 'CINT',
    completeUrl: 'https://cint.com/complete?uid={{uid}}&age={{age}}&sex={{gender}}',
  };
  
  console.log('--- Testing RouterService Dynamic Parameter Injection ---');
  
  // Case 1: Placeholder replacement
  const url1 = router.getStatusRedirectUrl('complete', mockRespondent, mockSupplier);
  console.log('Test 1 (Placeholders):');
  console.log('Expected: https://cint.com/complete?uid=SUP-RID-001&age=30&sex=female&custom_id=CUST-99');
  console.log('Actual:   ' + url1);
  
  if (url1.includes('age=30') && url1.includes('sex=female') && url1.includes('custom_id=CUST-99')) {
    console.log('✅ SUCCESS: Placeholders replaced and extra params appended!');
  } else {
    console.error('❌ FAILED: Param injection incorrect');
  }

  // Case 2: No placeholders, all should be appended
  const mockSupplier2: any = {
    code: 'DYNATA',
    completeUrl: 'https://dynata.com/callback',
  };
  const url2 = router.getStatusRedirectUrl('complete', mockRespondent, mockSupplier2);
  console.log('\nTest 2 (Auto-append):');
  console.log('Expected: https://dynata.com/callback?uid=SUP-RID-001&age=30&gender=female&custom_id=CUST-99'); // uid is auto-appended but maybe others too
  console.log('Actual:   ' + url2);

  if (url2.includes('age=30') && url2.includes('gender=female')) {
     console.log('✅ SUCCESS: All extra params appended automatically!');
  } else {
    console.error('❌ FAILED: Auto-append failed');
  }
}

test().catch(console.error);
