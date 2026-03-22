# BlockCert - Decentralized Certificate Verifier

## Prerequisites
- Python 3.10+ installed.
- A modern web browser (Chrome, Edge, Firefox).

## First Time Setup
1.  Navigate to the `backend` folder in your terminal:
    ```powershell
    cd backend
    ```
2.  Create a virtual environment (if not already there):
    ```powershell
    python -m venv venv
    ```
3.  Install dependencies:
    ```powershell
    venv\Scripts\pip install -r requirements.txt
    ```

## How to Run (Every Time)

1.  **Open Terminal and Navigate to Backend**:
    *   Open your terminal in the main `website` folder.
    *   **CRITICAL STEP**: Type the following command and press Enter:
        ```powershell
        cd backend
        ```
    *   *Verify you are in the `backend` folder (your prompt should end with `\backend`).*

2.  **Start the Backend Server**:
    Run the following command:
    ```powershell
    venv\Scripts\python main.py
    ```
    *You should see a message saying "Application startup complete".*

3.  **Open the Application**:
    -   Go to your file explorer and double-click `index.html` in the main project folder.
    -   OR, if you are already in the browser, verify the URL starts with `file:///`.

## Features
-   **Issue Certificate**: Go to "For Institutions" -> Login (or bypass) -> Issue Certificate.
-   **Verify Certificate**: Go to "Verify Now" and enter a Certificate ID.
-   **Chatbot**: Ask questions about blockchain (Requires `GROQ_API_KEY` in `.env`).

## Troubleshooting
-   **"ModuleNotFoundError"**: Make sure you are using `venv\Scripts\python` and not just `python` if your global python doesn't have the packages.
-   **"Connection Refused"**: Ensure the backend terminal is open and the server is running.
