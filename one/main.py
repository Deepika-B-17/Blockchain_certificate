from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os

# Initialize App
app = FastAPI(title="BlockCert Verifier", version="1.0")

# CORS (Allow Frontend to communicate)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Files (Frontend)
# Assumes 'project' is the root, so '../' to get to css/js/html if running from 'backend' dir
# Adjust paths based on where you run uvicorn
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

app.mount("/css", StaticFiles(directory=os.path.join(BASE_DIR, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(BASE_DIR, "js")), name="js")
# We will serve HTML files via a simple route or just open them directly. 
# For a pure static feel, we can mount the root, but let's keep it clean.

@app.get("/")
def read_root():
    return {"message": "Welcome to BlockCert Verifier API"}

from auth import router as auth_router
from certificate_api import router as cert_router
from chatbot_api import app as chat_app

app.include_router(auth_router)
app.include_router(cert_router)
app.mount("/chatbot", chat_app)

# Serve HTML files (Frontend)
app.mount("/", StaticFiles(directory=BASE_DIR, html=True), name="static")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
