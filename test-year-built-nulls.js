// Simple test to figure out year_built nulls bypass syntax
// Run with: node test-year-built-nulls.js

async function testYearBuiltNulls() {
    console.log("Testing year_built nulls bypass logic...\n");

    // Base query that should return 466 properties
    const baseQuery = {
        property_type: "MFR",
        zip: "15219",
        size: 8000,
        count: true,
        ids_only: true
    };

    // Test 1: Base query (no year_built filter)
    console.log("🧪 TEST 1: Base query (no filters)");
    const baseResult = await makeAPICall(baseQuery);
    const baseCount = baseResult.ids ? baseResult.ids.length : 0;
    console.log(`Result: ${baseCount} properties\n`);

    // Test 2: Year built filter only (should be 354 based on your data)
    console.log("🧪 TEST 2: Year built 1800-2010 (standard filter)");
    const yearOnlyQuery = {
        ...baseQuery,
        year_built_min: 1800,
        year_built_max: 2010
    };
    const yearOnlyResult = await makeAPICall(yearOnlyQuery);
    const yearOnlyCount = yearOnlyResult.ids ? yearOnlyResult.ids.length : 0;
    console.log(`Result: ${yearOnlyCount} properties\n`);

    // Test 3: Option A - Root level exclude (trying to include nulls)
    console.log("🧪 TEST 3: Option A - Root level exclude for nulls");
    const optionAQuery = {
        ...baseQuery,
        year_built_min: 1800,
        year_built_max: 2010,
        exclude: [
            { year_built: true }  // Exclude properties with null year_built (opposite of what we want)
        ]
    };
    const optionAResult = await makeAPICall(optionAQuery);
    const optionACount = optionAResult.ids ? optionAResult.ids.length : 0;
    console.log(`Result: ${optionACount} properties`);
    console.log(`Expected: Should be > 354 if nulls auto-pass is working\n`);

    // Test 4: Reverse test - exclude non-nulls (should be smaller number)
    console.log("🧪 TEST 4: Reverse test - exclude non-null year_built");
    const reverseQuery = {
        ...baseQuery,
        exclude: [
            { year_built: true }  // Exclude properties with null year_built
        ]
    };
    const reverseResult = await makeAPICall(reverseQuery);
    const reverseCount = reverseResult.ids ? reverseResult.ids.length : 0;
    console.log(`Result: ${reverseCount} properties`);
    console.log(`Expected: Should exclude null year_built properties\n`);

    // Test 5: Correct nulls auto-pass approach - NO exclude at all when we want to include nulls
    console.log("🧪 TEST 5: Nulls auto-pass - Remove exclude entirely");
    const nullsAutoPassQuery = {
        ...baseQuery,
        year_built_min: 1800,
        year_built_max: 2010
        // NO exclude field - let nulls pass through naturally
    };
    const nullsAutoPassResult = await makeAPICall(nullsAutoPassQuery);
    const nullsAutoPassCount = nullsAutoPassResult.ids ? nullsAutoPassResult.ids.length : 0;
    console.log(`Result: ${nullsAutoPassCount} properties`);
    console.log(`Expected: Should be same as standard year filter since nulls can't be explicitly included\n`);

    // Summary
    console.log("📊 SUMMARY:");
    console.log(`Base (no filter): ${baseCount}`);
    console.log(`Year filter only: ${yearOnlyCount}`);
    console.log(`Option A (array syntax): ${optionACount}`);
    console.log(`Exclude nulls test: ${reverseCount}`);
    console.log(`No exclude (Test 5): ${nullsAutoPassCount}`);
    
    if (optionACount > yearOnlyCount) {
        console.log("✅ SUCCESS: Option A is working - nulls are being included!");
    } else if (optionACount === yearOnlyCount) {
        console.log("❌ FAIL: Option A not working - same result as standard filter");
    } else {
        console.log("❓ UNEXPECTED: Option A gave fewer results than standard filter");
    }
}

async function makeAPICall(query) {
    try {
        const response = await fetch('http://localhost:3000/api/realestateapi', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(query)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API call failed:', error);
        return { count: 0, error: error.message };
    }
}

// Run the test
testYearBuiltNulls().catch(console.error);