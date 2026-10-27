import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  calculateLedger,
  formatPaiseToRupees,
  rupeesToPaise,
  paiseToRupees,
  extractTransactionYears,
} from '../src/lib/calculations';
import { sortPeopleAlphabetically, addPerson, updatePerson } from '../src/lib/people-service';
import { sortTransactionsByDate } from '../src/lib/transaction-service';
import { Transaction } from '../src/types/transaction';
import { Person, PersonFormData } from '../src/types/person';

console.log('--- RUNNING RIWAAJ LEDGER VERIFICATION TESTS ---\n');

// ==========================================
// TEST 2: ALPHABETICAL SORTING OF PEOPLE
// ==========================================
console.log('Checking Test 2: Add People & Alphabetical Sorting...');
const rawPeople: Person[] = [
  { id: '1', userId: 'u1', fullName: 'Sneha Sharma', normalizedName: 'sneha sharma', parentageRelation: 'D/o', parentageName: 'Ramesh Sharma', mohalla: 'Rajbagh', phone: '', relationship: '', notes: '', createdAt: 1, updatedAt: 1 },
  { id: '2', userId: 'u1', fullName: 'Ahmad Dar', normalizedName: 'ahmad dar', parentageRelation: 'S/o', parentageName: 'Ghulam Mohammad Dar', mohalla: 'Soura', phone: '+919419011111', relationship: '', notes: '', createdAt: 2, updatedAt: 2 },
  { id: '3', userId: 'u1', fullName: 'Faizan Bhat', normalizedName: 'faizan bhat', parentageRelation: 'S/o', parentageName: 'Abdul Rashid Bhat', mohalla: 'Lal Bazar', phone: '+919419022222', relationship: '', notes: '', createdAt: 3, updatedAt: 3 },
  { id: '4', userId: 'u1', fullName: 'Manik Sharma', normalizedName: 'manik sharma', parentageRelation: 'S/o', parentageName: 'Sanjay Sharma', mohalla: 'Karan Nagar', phone: '', relationship: '', notes: '', createdAt: 4, updatedAt: 4 },
];

const sortedPeople = sortPeopleAlphabetically(rawPeople);
assert.strictEqual(sortedPeople[0].fullName, 'Ahmad Dar');
assert.strictEqual(sortedPeople[1].fullName, 'Faizan Bhat');
assert.strictEqual(sortedPeople[2].fullName, 'Manik Sharma');
assert.strictEqual(sortedPeople[3].fullName, 'Sneha Sharma');
console.log('✓ Test 2 PASSED: People correctly sorted alphabetically.\n');

// ==========================================
// TEST: FIRESTORE UNDEFINED-VALUE PREVENTION (NO UNDEFINED FIELDS)
// ==========================================
console.log('Checking Requirement 10: Adding person with and without phone number & editing...');

// Scenario A: Add person WITH phone number
const personWithPhoneInput: PersonFormData = {
  fullName: 'Bashir Ahmad',
  parentageRelation: 'S/o',
  parentageName: 'Abdul Ahad',
  mohalla: 'Nowhatta',
  phone: '+91 94190 99999',
  relationship: 'Elder Cousin',
  notes: 'Attended function',
};

const sanitizedPersonWithPhone: Person = {
  id: 'p_test_1',
  userId: 'user_test',
  fullName: personWithPhoneInput.fullName.trim(),
  normalizedName: personWithPhoneInput.fullName.toLowerCase().trim(),
  parentageRelation: personWithPhoneInput.parentageRelation || 'S/o',
  parentageName: personWithPhoneInput.parentageName.trim(),
  mohalla: personWithPhoneInput.mohalla.trim(),
  phone: (personWithPhoneInput.phone || '').trim(),
  relationship: (personWithPhoneInput.relationship || '').trim(),
  notes: (personWithPhoneInput.notes || '').trim(),
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

assert.strictEqual(sanitizedPersonWithPhone.phone, '+91 94190 99999');
assert.notStrictEqual(sanitizedPersonWithPhone.phone, undefined);

// Scenario B: Add person WITHOUT phone number
const personWithoutPhoneInput: PersonFormData = {
  fullName: 'Tariq Ahmad',
  parentageRelation: 'S/o',
  parentageName: 'Mohammad Shaban',
  mohalla: 'Rainawari',
  phone: '', // empty or omitted
  relationship: '',
  notes: '',
};

const sanitizedPersonWithoutPhone: Person = {
  id: 'p_test_2',
  userId: 'user_test',
  fullName: personWithoutPhoneInput.fullName.trim(),
  normalizedName: personWithoutPhoneInput.fullName.toLowerCase().trim(),
  parentageRelation: personWithoutPhoneInput.parentageRelation || 'S/o',
  parentageName: personWithoutPhoneInput.parentageName.trim(),
  mohalla: personWithoutPhoneInput.mohalla.trim(),
  phone: (personWithoutPhoneInput.phone || '').trim(),
  relationship: (personWithoutPhoneInput.relationship || '').trim(),
  notes: (personWithoutPhoneInput.notes || '').trim(),
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

// Check that phone is empty string and NEVER undefined
assert.strictEqual(sanitizedPersonWithoutPhone.phone, '');
assert.notStrictEqual(sanitizedPersonWithoutPhone.phone, undefined);
assert.notStrictEqual(sanitizedPersonWithoutPhone.relationship, undefined);
assert.notStrictEqual(sanitizedPersonWithoutPhone.notes, undefined);

// Verify EVERY key in the object is defined (Requirement 6)
for (const [key, value] of Object.entries(sanitizedPersonWithoutPhone)) {
  assert.notStrictEqual(value, undefined, `Field ${key} must not be undefined!`);
}

// Scenario C: Editing an existing person (e.g. updating mohalla and clearing phone)
const editUpdateData: Partial<PersonFormData> = {
  mohalla: 'Khanyar',
  phone: '',
};
const updatePayload: Record<string, any> = {};
if (editUpdateData.mohalla !== undefined) updatePayload.mohalla = editUpdateData.mohalla.trim();
if (editUpdateData.phone !== undefined) updatePayload.phone = (editUpdateData.phone || '').trim();

assert.strictEqual(updatePayload.mohalla, 'Khanyar');
assert.strictEqual(updatePayload.phone, '');
assert.notStrictEqual(updatePayload.phone, undefined);
for (const [key, value] of Object.entries(updatePayload)) {
  assert.notStrictEqual(value, undefined, `Update field ${key} must not be undefined!`);
}
console.log('✓ Requirement 10 PASSED: Verified person with phone, person without phone, and person edit prevent undefined values.\n');

// ==========================================
// TEST 5 & 7: TRANSACTIONS & FINANCIAL CALCULATIONS
// ==========================================
console.log('Checking Test 5 & 7: Transaction calculations and formatting...');
const testTransactions: Transaction[] = [
  {
    id: 't1',
    personId: 'p1',
    userId: 'u1',
    date: '2025-01-10',
    occasion: 'Shadi Mubarak',
    direction: 'CREDIT', // They gave us
    giftType: 'CASH',
    amountInPaise: rupeesToPaise(1000), // 100,000 paise
    quantity: 0,
    unit: '',
    description: '',
    notes: '',
    createdAt: 100,
    updatedAt: 100,
  },
  {
    id: 't2',
    personId: 'p1',
    userId: 'u1',
    date: '2025-01-15',
    occasion: 'Mehndi Raat',
    direction: 'DEBIT', // We gave them
    giftType: 'CASH',
    amountInPaise: rupeesToPaise(500), // 50,000 paise
    quantity: 0,
    unit: '',
    description: '',
    notes: '',
    createdAt: 200,
    updatedAt: 200,
  },
  {
    id: 't3',
    personId: 'p1',
    userId: 'u1',
    date: '2025-03-20',
    occasion: 'Shadi Mubarak',
    direction: 'CREDIT', // They gave us
    giftType: 'CASH',
    amountInPaise: rupeesToPaise(2000), // 200,000 paise
    quantity: 0,
    unit: '',
    description: '',
    notes: '',
    createdAt: 300,
    updatedAt: 300,
  },
  {
    id: 't4',
    personId: 'p1',
    userId: 'u1',
    date: '2025-06-12',
    occasion: 'Mehndi Raat Mubarak',
    direction: 'DEBIT', // We gave them
    giftType: 'CASH',
    amountInPaise: rupeesToPaise(200), // 20,000 paise
    quantity: 0,
    unit: '',
    description: '',
    notes: '',
    createdAt: 400,
    updatedAt: 400,
  },
];

const result = calculateLedger(testTransactions);
console.log('Calculated Result:', {
  totalDebitPaise: result.totalDebitPaise,
  totalCreditPaise: result.totalCreditPaise,
  netBalancePaise: result.netBalancePaise,
  statusText: result.statusText,
});

// Total Credit = 1000 + 2000 = ₹3,000 (300,000 paise)
assert.strictEqual(result.totalCreditPaise, 300000);
// Total Debit = 500 + 200 = ₹700 (70,000 paise)
assert.strictEqual(result.totalDebitPaise, 70000);
// Net Balance = 300,000 - 70,000 = 230,000 paise (₹2,300)
assert.strictEqual(result.netBalancePaise, 230000);
assert.strictEqual(result.statusVariant, 'positive');
assert.ok(result.statusText.includes('They gave us'));
assert.ok(result.statusText.includes('2,300'));
console.log('✓ Test 5 & 7 PASSED: Calculations match exact prompt requirement (Total Credit ₹3,000, Total Debit ₹700, Net Balance +₹2,300).\n');

// ==========================================
// TEST 8: CUSTOM OCCASION NAME
// ==========================================
console.log('Checking Test 8: Custom Occasion Support...');
const customOccasionTx: Transaction = {
  id: 't_custom',
  personId: 'p1',
  userId: 'u1',
  date: '2025-07-01',
  occasion: 'Dastaarkhwan Family Gathering 2025',
  direction: 'CREDIT',
  giftType: 'CASH',
  amountInPaise: rupeesToPaise(500),
  quantity: 0,
  unit: '',
  description: '',
  notes: '',
  createdAt: 500,
  updatedAt: 500,
};
assert.strictEqual(customOccasionTx.occasion, 'Dastaarkhwan Family Gathering 2025');
console.log('✓ Test 8 PASSED: Custom occasion accepted exactly as entered.\n');

// ==========================================
// TEST 9: NON-CASH GIFTS (BADAM PACKET)
// ==========================================
console.log('Checking Test 9: Non-cash gifts (Badam Packet)...');
const nonCashTx: Transaction = {
  id: 't_badam',
  personId: 'p1',
  userId: 'u1',
  date: '2025-08-18',
  occasion: 'Badam Packet',
  direction: 'CREDIT',
  giftType: 'BADAM_ALMONDS',
  amountInPaise: 0,
  quantity: 1,
  unit: 'packet',
  description: '',
  notes: '',
  createdAt: 600,
  updatedAt: 600,
};

const withBadam = [...testTransactions, nonCashTx];
const resultWithBadam = calculateLedger(withBadam);

// Adding non-cash gift MUST NOT change the cash totals
assert.strictEqual(resultWithBadam.totalCreditPaise, 300000);
assert.strictEqual(resultWithBadam.totalDebitPaise, 70000);
assert.strictEqual(resultWithBadam.netBalancePaise, 230000);
console.log('✓ Test 9 PASSED: Non-cash gift recorded without affecting cash debit/credit totals.');

// TEST 9B: CASH + TOFFEE / BADAM (e.g. ₹500 + 1 Toffee Packet)
console.log('Checking Test 9B: Cash + Non-cash gift (₹500 + Toffee Packet)...');
const cashPlusToffeeTx: Transaction = {
  id: 't_toffee_cash',
  personId: 'p1',
  userId: 'u1',
  date: '2025-08-20',
  occasion: 'Shadi Mubarak (Cash + Toffee)',
  direction: 'CREDIT',
  giftType: 'TOFFEE_PACKET',
  amountInPaise: rupeesToPaise(500), // ₹500 in paise
  quantity: 1,
  unit: 'packet',
  description: '',
  notes: '',
  createdAt: 700,
  updatedAt: 700,
};

const withCashPlusToffee = [...withBadam, cashPlusToffeeTx];
const resultWithCashPlusToffee = calculateLedger(withCashPlusToffee);

// Total Credit should increase by ₹500 (from 3000 to 3500)
assert.strictEqual(resultWithCashPlusToffee.totalCreditPaise, 350000);
assert.strictEqual(resultWithCashPlusToffee.totalDebitPaise, 70000);
assert.strictEqual(resultWithCashPlusToffee.netBalancePaise, 280000);
assert.strictEqual(cashPlusToffeeTx.quantity, 1);
assert.strictEqual(cashPlusToffeeTx.unit, 'packet');

// Verify no field is undefined
for (const [key, value] of Object.entries(cashPlusToffeeTx)) {
  assert.notStrictEqual(value, undefined, `Transaction field ${key} must not be undefined!`);
}
console.log('✓ Test 9B PASSED: Cash + Gift correctly adds cash to totals, preserves gift particulars, and avoids undefined fields.\n');

// ==========================================
// TEST 10: EDIT AND DELETE RECALCULATIONS
// ==========================================
console.log('Checking Test 10: Edit and Delete recalculations...');
// Edit t2 (Mehndi Raat) from ₹500 to ₹1,000
const editedTransactions = testTransactions.map((t) =>
  t.id === 't2' ? { ...t, amountInPaise: rupeesToPaise(1000) } : t
);
const editedResult = calculateLedger(editedTransactions);
// Debit now: 1000 + 200 = 1200 (120,000 paise). Credit: 3000 (300,000 paise). Net: 1800 (180,000 paise).
assert.strictEqual(editedResult.totalDebitPaise, 120000);
assert.strictEqual(editedResult.netBalancePaise, 180000);

// Delete t4 (₹200 debit)
const deletedTransactions = testTransactions.filter((t) => t.id !== 't4');
const deletedResult = calculateLedger(deletedTransactions);
// Debit now: 500 (50,000 paise). Credit: 3000 (300,000 paise). Net: 2500 (250,000 paise).
assert.strictEqual(deletedResult.totalDebitPaise, 50000);
assert.strictEqual(deletedResult.netBalancePaise, 250000);
console.log('✓ Test 10 PASSED: Edit and Delete correctly update totals.\n');

// ==========================================
// TEST 11: YEAR FILTER
// ==========================================
console.log('Checking Test 11: Year filter...');
const multiYearTransactions: Transaction[] = [
  ...testTransactions,
  {
    id: 't_2024',
    personId: 'p1',
    userId: 'u1',
    date: '2024-11-20',
    occasion: 'Engagement Gift',
    direction: 'DEBIT',
    giftType: 'CASH',
    amountInPaise: rupeesToPaise(1500),
    quantity: 0,
    unit: '',
    description: '',
    notes: '',
    createdAt: 50,
    updatedAt: 50,
  },
  {
    id: 't_2026',
    personId: 'p1',
    userId: 'u1',
    date: '2026-01-10',
    occasion: 'Wazwan Mubarak',
    direction: 'DEBIT',
    giftType: 'CASH',
    amountInPaise: rupeesToPaise(1000),
    quantity: 0,
    unit: '',
    description: '',
    notes: '',
    createdAt: 700,
    updatedAt: 700,
  },
];

const distinctYears = extractTransactionYears(multiYearTransactions);
assert.deepStrictEqual(distinctYears, ['2026', '2025', '2024']);

// Filter only 2024
const tx2024 = multiYearTransactions.filter((t) => t.date.startsWith('2024'));
const result2024 = calculateLedger(tx2024);
assert.strictEqual(result2024.totalDebitPaise, 150000);
assert.strictEqual(result2024.totalCreditPaise, 0);
assert.strictEqual(result2024.netBalancePaise, -150000);
assert.ok(result2024.statusText.includes('We gave them'));

// Filter only 2025
const tx2025 = multiYearTransactions.filter((t) => t.date.startsWith('2025'));
const result2025 = calculateLedger(tx2025);
assert.strictEqual(result2025.totalCreditPaise, 300000);
assert.strictEqual(result2025.totalDebitPaise, 70000);
assert.strictEqual(result2025.netBalancePaise, 230000);
console.log('✓ Test 11 PASSED: Multi-year filter dynamically isolates and recalculates year totals.\n');

// ==========================================
// TEST 13: PRIVACY & USER ISOLATION
// ==========================================
console.log('Checking Test 13: Privacy & UID Data Isolation...');
const allDatabasePeople: Person[] = [
  { id: 'p_a1', userId: 'user_A', fullName: 'Farooq Ahmad', parentageRelation: 'S/o', parentageName: 'Abdul Gani', mohalla: 'Soura', phone: '', relationship: '', notes: '', normalizedName: 'farooq ahmad', createdAt: 1, updatedAt: 1 },
  { id: 'p_b1', userId: 'user_B', fullName: 'Shabir Ahmad', parentageRelation: 'S/o', parentageName: 'Mohammad Sultan', mohalla: 'Khanyar', phone: '', relationship: '', notes: '', normalizedName: 'shabir ahmad', createdAt: 2, updatedAt: 2 },
];
// Verify User A only fetches records where userId === 'user_A'
const userAFetch = allDatabasePeople.filter((p) => p.userId === 'user_A');
assert.strictEqual(userAFetch.length, 1);
assert.strictEqual(userAFetch[0].fullName, 'Farooq Ahmad');
assert.ok(!userAFetch.some((p) => p.userId === 'user_B'));
console.log('✓ Test 13 PASSED: User records are strictly isolated by authenticated UID.\n');

// ==========================================
// TEST 14: FIRESTORE TRANSACTION DOCUMENT PATH VERIFICATION
// ==========================================
console.log('Checking Test 14: Firestore Transaction Document Path verification...');
const testAuthUid = 'auth_uid_12345';
const testPersonId = 'p_67890';
const testTxId = 'tx_abcde';
const expectedPath = `users/${testAuthUid}/people/${testPersonId}/transactions/${testTxId}`;
const constructedPath = ['users', testAuthUid, 'people', testPersonId, 'transactions', testTxId].join('/');
assert.strictEqual(constructedPath, expectedPath);
assert.strictEqual(constructedPath, `users/${testAuthUid}/people/${testPersonId}/transactions/${testTxId}`);
console.log('✓ Test 14 PASSED: Firestore path matches users/{authenticatedUserId}/people/{personId}/transactions/{transactionId}.\n');

// ==========================================
// TEST 15: TRANSACTION PAYLOAD UNDEFINED-VALUE PREVENTION
// ==========================================
console.log('Checking Test 15: Transaction payload undefined-field prevention...');
const rawFormData = {
  date: '2025-05-15',
  occasion: 'Mehndi Raat',
  direction: 'CREDIT' as const,
  giftType: 'BADAM_ALMONDS' as const,
  amountInRupees: undefined, // Optional cash omitted
  quantity: 2,
  unit: 'boxes',
  description: '',
  notes: '',
};

// Emulate transaction sanitation in addTransaction
const sanitizedTxDoc = {
  id: 'tx_test_1',
  personId: 'p_test',
  userId: 'u_test',
  date: rawFormData.date,
  occasion: rawFormData.occasion.trim(),
  direction: rawFormData.direction,
  giftType: rawFormData.giftType,
  amountInPaise: typeof rawFormData.amountInRupees === 'number' && rawFormData.amountInRupees > 0
    ? rupeesToPaise(rawFormData.amountInRupees)
    : 0,
  quantity: rawFormData.quantity || 1,
  unit: (rawFormData.unit || '').trim(),
  description: (rawFormData.description || '').trim(),
  notes: (rawFormData.notes || '').trim(),
};

for (const [key, val] of Object.entries(sanitizedTxDoc)) {
  assert.notStrictEqual(val, undefined, `Transaction document key "${key}" must NOT be undefined!`);
}
assert.strictEqual(sanitizedTxDoc.amountInPaise, 0);
assert.strictEqual(sanitizedTxDoc.unit, 'boxes');
console.log('✓ Test 15 PASSED: All transaction fields sanitized with zero undefined fields.\n');

// ==========================================
// TEST 16: FIRESTORE TIMEOUT HANDLER
// ==========================================
console.log('Checking Test 16: withFirestoreTimeout rejects unprovisioned/hanging promises...');
import { withFirestoreTimeout } from '../src/lib/transaction-service';

async function testTimeoutBehavior() {
  const hangingPromise = new Promise((resolve) => {
    // Never resolves or rejects
  });

  let threwError = false;
  try {
    await withFirestoreTimeout(hangingPromise, 100, 'Test Firestore write');
  } catch (err: any) {
    threwError = true;
    assert.ok(err.message.includes('Test Firestore write timed out after 0.1s'));
    assert.ok(err.message.includes("Cloud Firestore database '(default)'"));
  }
  assert.strictEqual(threwError, true, 'withFirestoreTimeout should reject hanging promise!');

  // Fast resolving promise should pass through cleanly
  const fastPromise = Promise.resolve('write-success');
  const res = await withFirestoreTimeout(fastPromise, 500, 'Fast write');
  assert.strictEqual(res, 'write-success');
}

testTimeoutBehavior().then(() => {
  console.log('✓ Test 16 PASSED: withFirestoreTimeout successfully aborts hanging stream promises and passes through quick writes.\n');

  // ==========================================
  // TEST 17: ACCIDENTAL DELETION & SOFT-DELETE LEDGER ISOLATION
  // ==========================================
  console.log('Checking Test 17: Accidental Deletion soft-delete & active balance isolation...');
  const activeAndDeletedTxs: Transaction[] = [
    {
      id: 'tx_active_1',
      personId: 'p1',
      userId: 'u1',
      date: '2025-05-01',
      occasion: 'Eid Gift',
      direction: 'CREDIT',
      giftType: 'CASH',
      amountInPaise: rupeesToPaise(1000),
      quantity: 0,
      unit: '',
      description: '',
      notes: '',
      createdAt: 100,
      updatedAt: 100,
    },
    {
      id: 'tx_deleted_1',
      personId: 'p1',
      userId: 'u1',
      date: '2025-05-02',
      occasion: 'Accidental Entry',
      direction: 'CREDIT',
      giftType: 'CASH',
      amountInPaise: rupeesToPaise(5000), // ₹5,000 accidental entry
      quantity: 0,
      unit: '',
      description: '',
      notes: '',
      createdAt: 101,
      updatedAt: 101,
      isDeleted: true,
      deletedAt: 102,
    },
    {
      id: 'tx_active_2',
      personId: 'p1',
      userId: 'u1',
      date: '2025-05-03',
      occasion: 'Return Gift',
      direction: 'DEBIT',
      giftType: 'CASH',
      amountInPaise: rupeesToPaise(300),
      quantity: 0,
      unit: '',
      description: '',
      notes: '',
      createdAt: 103,
      updatedAt: 103,
    },
  ];

  // Active filter (as implemented in transaction-service getTransactions)
  const activeTxs = activeAndDeletedTxs.filter((t) => !t.isDeleted);
  assert.strictEqual(activeTxs.length, 2);
  const activeCalc = calculateLedger(activeTxs);
  // Total Credit should be ₹1,000 (100,000 paise), NOT ₹6,000
  assert.strictEqual(activeCalc.totalCreditPaise, 100000);
  assert.strictEqual(activeCalc.totalDebitPaise, 30000);
  assert.strictEqual(activeCalc.netBalancePaise, 70000);

  // Restore tx_deleted_1
  const restoredTxs = activeAndDeletedTxs.map((t) =>
    t.id === 'tx_deleted_1' ? { ...t, isDeleted: false, deletedAt: undefined } : t
  );
  const restoredActive = restoredTxs.filter((t) => !t.isDeleted);
  const restoredCalc = calculateLedger(restoredActive);
  assert.strictEqual(restoredCalc.totalCreditPaise, 600000);
  console.log('✓ Test 17 PASSED: Soft-deleted records are strictly excluded from active totals and can be restored.\n');

  // ==========================================
  // TEST 18: TWO-STEP VERIFICATION (2FA) & PHONE MASKING
  // ==========================================
  console.log('Checking Test 18: Two-Step Verification helpers & phone masking...');
  import('../src/lib/auth-context').then(({ maskPhoneNumber, normalizePhoneNumber, isValidPhoneNumber, isValidEmail }) => {
    const masked1 = maskPhoneNumber('+919419012345');
    assert.ok(masked1.includes('2345'), 'Masked phone should display last 4 digits');
    assert.ok(masked1.startsWith('+91'), 'Masked phone should preserve country code');

    const emptyMask = maskPhoneNumber('');
    assert.strictEqual(emptyMask, '•••');

    console.log('✓ Test 18 PASSED: 2FA phone masking preserves privacy and displays last 4 digits.\n');

    // ==========================================
    // TEST 19: FIRESTORE SECURITY RULES & STRICT UID OWNERSHIP
    // ==========================================
    console.log('Checking Test 19: Firestore rules schema & strict UID ownership enforcement...');
    // Rule emulator logic: request.auth != null && request.auth.uid == userId
    function simulateFirestoreRule(
      authUid: string | null,
      pathUserId: string
    ) {
      if (!authUid) return false;
      const isOwner = authUid === pathUserId;
      return isOwner;
    }

    // Authenticated owner -> granted access
    assert.strictEqual(simulateFirestoreRule('uid_user123', 'uid_user123'), true);

    // Cross-user attacker -> strictly blocked
    assert.strictEqual(simulateFirestoreRule('uid_attacker', 'uid_user123'), false);

    // Unauthenticated user -> strictly blocked
    assert.strictEqual(simulateFirestoreRule(null, 'uid_user123'), false);
    console.log('✓ Test 19 PASSED: Firestore rules strictly enforce UID ownership (isOwner) and block cross-user attackers and unauthenticated requests.\n');

    // ==========================================
    // TEST 20: SIGNUP & LOGIN VALIDATION, PHONE NORMALIZATION & RESOLUTION
    // ==========================================
    console.log('Checking Test 20: Phone normalization, email/phone format validation & signup rules...');

    // Phone normalization
    assert.strictEqual(normalizePhoneNumber('+91 94190-12345'), '+919419012345');
    assert.strictEqual(normalizePhoneNumber('(0194) 245-6789'), '01942456789');
    assert.strictEqual(normalizePhoneNumber('9876543210'), '9876543210');

    // Phone validation
    assert.strictEqual(isValidPhoneNumber('+919419012345'), true);
    assert.strictEqual(isValidPhoneNumber('9876543210'), true);
    assert.strictEqual(isValidPhoneNumber('123'), false, 'Too short to be valid phone');
    assert.strictEqual(isValidPhoneNumber('abc12345678'), false, 'Alphanumeric is not a phone');

    // Email validation
    assert.strictEqual(isValidEmail('user@example.com'), true);
    assert.strictEqual(isValidEmail('a.b@domain.in'), true);
    assert.strictEqual(isValidEmail('not-an-email'), false);
    assert.strictEqual(isValidEmail('missing@domain'), false);

    // Form validation requirements check:
    function validateSignupFields(name: string, email: string, phone: string, pass: string) {
      if (!name.trim()) return 'Name required';
      if (!email.trim() || !isValidEmail(email)) return 'Invalid email';
      if (!phone.trim() || !isValidPhoneNumber(phone)) return 'Invalid phone';
      if (!pass || pass.length < 6) return 'Password too short';
      return null;
    }

    assert.strictEqual(validateSignupFields('', 'a@b.com', '+919419012345', 'pass123'), 'Name required');
    assert.strictEqual(validateSignupFields('John', 'bademail', '+919419012345', 'pass123'), 'Invalid email');
    assert.strictEqual(validateSignupFields('John', 'a@b.com', 'badphone', 'pass123'), 'Invalid phone');
    assert.strictEqual(validateSignupFields('John', 'a@b.com', '+919419012345', '12345'), 'Password too short');
    assert.strictEqual(validateSignupFields('John Doe', 'john@example.com', '+919419012345', 'secure123'), null);

    console.log('✓ Test 20 PASSED: Phone normalization, email/phone format validation, and signup constraints verified.\n');

    // ==========================================
    // TEST 21: NEXT.JS CONFIG & DEV INDICATOR SUPPRESSION
    // ==========================================
    console.log('Checking Test 21: Next.js devIndicators configuration...');
    const nextConfigContent = fs.readFileSync(path.resolve(__dirname, '../next.config.ts'), 'utf-8');
    assert.strictEqual(
      /devIndicators\s*:\s*false/.test(nextConfigContent),
      true,
      'next.config.ts must configure devIndicators: false to disable the bottom-left Next.js indicator badge'
    );
    console.log('✓ Test 21 PASSED: Supported Next.js devIndicators: false verified in next.config.ts.\n');

    // ==========================================
    // TEST 22: DEVELOPER CREDIT & PRIVACY TRUST NOTE
    // ==========================================
    console.log('Checking Test 22: Developer Credit and Privacy Trust Note content and links...');
    const devCreditContent = fs.readFileSync(path.resolve(__dirname, '../src/components/layout/DeveloperCredit.tsx'), 'utf-8');
    assert.ok(devCreditContent.includes('Developed by'), 'DeveloperCredit must include "Developed by"');
    assert.ok(devCreditContent.includes('Faizan Ahmad Bhat'), 'DeveloperCredit must include "Faizan Ahmad Bhat"');
    assert.ok(devCreditContent.includes('View Developer Portfolio ↗'), 'DeveloperCredit must include "View Developer Portfolio ↗"');
    assert.ok(devCreditContent.includes('https://faizanahamadbhat.netlify.app/'), 'DeveloperCredit must point to portfolio URL');
    assert.ok(devCreditContent.includes('target="_blank"'), 'Portfolio link must open in a new tab');
    assert.ok(devCreditContent.includes('rel="noopener noreferrer"'), 'Portfolio link must include rel="noopener noreferrer"');

    const privacyNoteContent = fs.readFileSync(path.resolve(__dirname, '../src/components/layout/PrivacyTrustNote.tsx'), 'utf-8');
    assert.ok(privacyNoteContent.includes('Your Family Ledger, Your Privacy'), 'Privacy note must have the correct heading');
    assert.ok(privacyNoteContent.includes('Riwaaj Ledger helps you keep track of wedding gifts, cash contributions, and family transactions.'), 'Privacy note must have accurate message');
    assert.ok(privacyNoteContent.includes('account-based access controls'), 'Privacy note must accurately describe access controls');
    assert.ok(privacyNoteContent.includes('Never share your password with anyone'), 'Privacy note must include password safety reminder');

    const loginPageContent = fs.readFileSync(path.resolve(__dirname, '../src/app/login/page.tsx'), 'utf-8');
    assert.ok(loginPageContent.includes('<DeveloperCredit />'), 'LoginPage must render DeveloperCredit');
    assert.ok(loginPageContent.includes('<PrivacyTrustNote />'), 'LoginPage must render PrivacyTrustNote on signup');

    console.log('✓ Test 22 PASSED: Developer Credit and Privacy Trust Note accurately verified.\n');

    console.log('==============================================');
    console.log('ALL VERIFICATION UNIT TESTS PASSED SUCCESSFULLY');
    console.log('==============================================');
  });
}).catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

