import React from "react";
import PolicyLayout from "./PolicyLayout";

export default function RefundPolicy() {
  return (
    <PolicyLayout title="Refund Policy" updated="22 Feb 2026">
      <p>
        At Ekabhumi, we sell cosmetic and personal care products. Due to hygiene
        and safety reasons, returns and refunds are accepted only under the
        specific conditions mentioned below.
      </p>

      <h3>Returns (7 days)</h3>
      <p>
        Returns are accepted within <strong>7 days</strong> of delivery only if
        the product is <strong>unused, unopened</strong>, and in its{" "}
        <strong>original packaging</strong>.
      </p>
      <p>
        <strong>Opened or used cosmetic products are not eligible for return</strong>{" "}
        due to hygiene and safety reasons.
      </p>

      <h3>Damaged or Wrong Item</h3>
      <p>
        If you receive a damaged, leaked, defective, or incorrect item, contact
        us as soon as possible after delivery with the following details:
      </p>
      <ul>
        <li>Order ID</li>
        <li>Unboxing photos or videos, if available</li>
        <li>Clear product images showing the issue</li>
      </ul>
      <p>
        After review, we will arrange a replacement or refund where applicable.
      </p>

      <h3>Refunds</h3>
      <p>
        If a refund is approved, the amount will be processed back to the
        original payment method used during purchase.
      </p>
      <p>
        Refund processing typically takes <strong>5–7 business days</strong>,
        although the final credit time may vary depending on the bank or payment
        provider.
      </p>

      <h3>Non-Returnable Items</h3>
      <p>
        Products that are opened, used, damaged due to customer handling, or not
        returned in original condition may not be eligible for return or refund.
      </p>

      <h3>Contact</h3>
      <ul>
        <li>Email: <strong>bhumihlifestyle@gmail.com</strong></li>
        <li>Phone: <strong>+91 78290 33319</strong></li>
        <li>Location: Kaloor, Kochi, Kerala, India</li>
      </ul>
    </PolicyLayout>
  );
}