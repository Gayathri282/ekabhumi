import React from "react";
import PolicyLayout from "./PolicyLayout";

export default function CancellationPolicy() {
  return (
    <PolicyLayout title="Cancellation Policy" updated="22 Feb 2026">
      <p>
        At Ekabhumi, customers may contact us immediately after placing an order
        if they need help with cancellation.
      </p>

      <h3>Order Cancellation</h3>
      <p>
        Orders cannot be guaranteed for cancellation once placed and confirmed.
        However, if you contact us immediately after placing the order, we will
        try to assist you if dispatch has not yet started.
      </p>

      <h3>After Dispatch</h3>
      <p>
        Once the order has been dispatched, cancellation is not possible.
      </p>

      <h3>How to Request Cancellation</h3>
      <p>
        To request cancellation, please contact our support team as soon as
        possible with your order details.
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