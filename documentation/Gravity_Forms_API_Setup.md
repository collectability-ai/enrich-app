
# Gravity Forms and API Integration Assistance

### Summary of Steps
1. Created Gravity Form with necessary fields for API input.
2. Wrote a WordPress custom plugin to aggregate input into JSON format using Gravity Forms hooks.
3. Explained how to embed and style the Gravity Form using Elementor or custom CSS.
4. Recommended steps to integrate Stripe billing after API submission.

### Key Code Sections
#### WordPress Plugin for JSON Aggregation
```php
<?php
/**
 * Plugin Name: Gravity Forms JSON Aggregator
 * Description: Custom plugin to aggregate Gravity Forms inputs into a JSON format for API submission.
 * Version: 1.0
 * Author: Your Name
 */

// Prevent direct access to the file
if (!defined('ABSPATH')) {
    exit;
}

// Hook your custom functionality into the Gravity Forms submission process
add_action('gform_pre_submission', 'gf_json_aggregator');

/**
 * Aggregates Gravity Forms inputs into a JSON payload.
 *
 * @param array $form The form data.
 */
function gf_json_aggregator($form) {
    // Define the IDs of your fields
    $name_field_id = 1; // Replace with your actual Name field ID
    $address_1_field_id = 2; // Replace with your actual Address 1 field ID
    $address_2_field_id = 3; // Replace with your actual Address 2 field ID
    $phone_field_ids = [4, 5, 6, 7]; // Replace with your Phone field IDs
    $email_field_ids = [8, 9, 10, 11]; // Replace with your Email field IDs
    $hidden_field_id = 12; // Replace with your Hidden field ID for JSON

    // Retrieve inputs from the form
    $name = rgpost("input_$name_field_id");

    $address1 = [
        'line1' => rgpost("input_{$address_1_field_id}_1"),
        'city' => rgpost("input_{$address_1_field_id}_3"),
        'region' => rgpost("input_{$address_1_field_id}_4"),
        'postalCode' => rgpost("input_{$address_1_field_id}_5"),
        'countryCode' => rgpost("input_{$address_1_field_id}_6"),
    ];

    $address2 = [
        'line1' => rgpost("input_{$address_2_field_id}_1"),
        'city' => rgpost("input_{$address_2_field_id}_3"),
        'region' => rgpost("input_{$address_2_field_id}_4"),
        'postalCode' => rgpost("input_{$address_2_field_id}_5"),
        'countryCode' => rgpost("input_{$address_2_field_id}_6"),
    ];

    $phones = array_filter(array_map('rgpost', array_map(fn($id) => "input_$id", $phone_field_ids)));
    $emails = array_filter(array_map('rgpost', array_map(fn($id) => "input_$id", $email_field_ids)));

    // Create the aggregated JSON payload
    $json_payload = json_encode([
        'nameAddresses' => [
            [
                'fullName' => $name,
                'address' => $address1,
            ],
            [
                'fullName' => $name,
                'address' => $address2,
            ],
        ],
        'phoneNumbers' => $phones,
        'emailAddresses' => $emails,
    ]);

    // Store the JSON payload in a hidden field
    $_POST["input_$hidden_field_id"] = $json_payload;

    // Optional: Log JSON payload for debugging
    error_log("Aggregated JSON Payload: " . print_r($json_payload, true));
}
```

#### Styling Gravity Form with CSS
```css
.gform_wrapper {
    max-width: 600px;
    margin: 0 auto;
    background: #f9f9f9;
    padding: 20px;
    border-radius: 10px;
}

.gform_wrapper .gfield {
    margin-bottom: 15px;
}

.gform_wrapper .gfield_label {
    font-weight: bold;
    font-size: 16px;
}

.gform_wrapper input[type="text"],
.gform_wrapper input[type="email"],
.gform_wrapper select {
    width: 100%;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 5px;
}

.gform_wrapper input[type="submit"] {
    background-color: #0073aa;
    color: white;
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
}

.gform_wrapper input[type="submit"]:hover {
    background-color: #005f8d;
}
```

#### Recommendations
1. Use Elementor Pro's **Gravity Forms widget** for seamless styling.
2. Ensure all field IDs in the plugin code match your actual form fields.
3. Test the form thoroughly before proceeding to Stripe integration.

---

Let me know if you need further assistance!
