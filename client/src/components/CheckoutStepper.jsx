import React from "react";
import "./CheckoutStepper.css";

const steps = ["Address", "Payment", "Success"];

function CheckoutStepper({ current = 0 }) {
  return (
    <nav className="ck-stepper" aria-label="Checkout progress">
      <div className="ck-stepper__container">
        {steps.map((label, i) => {
          const isDone = i < current || (current === 2 && i === 2);
          const isActive = i === current && current < 2;
          let stepClass = "ck-stepper__step";
          if (isDone) stepClass += " ck-stepper__step--done";
          else if (isActive) stepClass += " ck-stepper__step--active";

          return (
            <React.Fragment key={label}>
              {i > 0 && (
                <div
                  className={`ck-stepper__line ${
                    i <= current ? "ck-stepper__line--filled" : ""
                  }`}
                />
              )}
              <div className={stepClass}>
                <span className="ck-stepper__circle" aria-hidden="true">
                  {isDone ? "✓" : i + 1}
                </span>
                <span className="ck-stepper__label">{label}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
}

export default CheckoutStepper;
