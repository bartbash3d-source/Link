# Link

A tiny shared-color site. Everyone who opens the site sees the same color, and one person controls it.

- `/` is the viewer page. It shows the color and has no buttons.
- `/main` is the controller page. Pressing a button changes the color for everyone.

## Optional: lock the controller

Set an environment variable named `CONTROL_KEY` (on Render: Environment tab).
Then open `/main?key=YOURSECRET`. Without the key, `/main` shows "Not found"
and color changes are rejected.

## Run locally

    npm install
    npm start

Then open http://localhost:3000 and http://localhost:3000/main
