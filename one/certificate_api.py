import os
import hashlib
import json
import random
import time
import requests
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()
PINATA_JWT = os.getenv("PINATA_JWT")

from fastapi import APIRouter, HTTPException, Body

router = APIRouter(prefix="/certificate", tags=["Certificate"])

# Paths for persistent storage
DB_PATH = os.path.join(os.path.dirname(__file__), "certificates.json")
LEDGER_PATH = os.path.join(os.path.dirname(__file__), "blockchain_ledger.json")

# Helper Functions
def load_json(path: str) -> Dict[str, Any]:
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_json(path: str, data: Dict[str, Any]) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)

@router.post("/issue")
def issue_certificate(data: Dict[str, Any] = Body(...)) -> Dict[str, Any]:
    cert_data = data
    student_email = data.get("student_email", "unknown@student.com")
    cert_string = json.dumps(cert_data, sort_keys=True)
    cert_hash = hashlib.sha256(cert_string.encode("utf-8")).hexdigest()
    
    # 1. Upload to IPFS via Pinata
    if not PINATA_JWT or PINATA_JWT == "your_pinata_jwt_here":
        raise HTTPException(status_code=500, detail="Missing PINATA_JWT in environment variables")
        
    pinata_url = "https://api.pinata.cloud/pinning/pinJSONToIPFS"
    headers = {
        "Authorization": f"Bearer {PINATA_JWT}",
        "Content-Type": "application/json"
    }
    cert_id = cert_hash[:10]
    payload = {
        "pinataContent": cert_data,
        "pinataMetadata": {
            "name": f"BlockCert-{cert_id}"
        }
    }
    
    try:
        response = requests.post(pinata_url, json=payload, headers=headers)
        response.raise_for_status()
        cid = response.json().get("IpfsHash")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pinata API failure: {str(e)}")
    
    # 2. Simulate Real Blockchain Transaction
    tx_hash = f"0x{hashlib.sha256(str(time.time()).encode('utf-8')).hexdigest()}"
    block_num = random.randint(1000000, 9999999)
    
    # 3. Add to BLOCKCHAIN LEDGER (Immutable Simulation)
    ledger = load_json(LEDGER_PATH)
    ledger[tx_hash] = {
        "cert_hash": cert_hash,
        "cid": cid,
        "block": block_num,
        "timestamp": time.time(),
        "status": "Confirmed"
    }
    save_json(LEDGER_PATH, ledger)
    
    # 3. Store Metadata for App Usage
    cert_id = cert_hash[:10]
    db = load_json(DB_PATH)
    db[cert_id] = {
        "data": cert_data,
        "hash": cert_hash,
        "tx_hash": tx_hash,
        "student_email": student_email,
        "valid": True
    }
    save_json(DB_PATH, db)
    
    return {
        "message": "Issued & Pinned to IPFS successfully",
        "certificate_id": cert_id,
        "hash": cert_hash,
        "cid": cid,
        "ipfs_url": f"https://ipfs.io/ipfs/{cid}",
        "transaction_hash": tx_hash,
        "block": block_num
    }

@router.get("/wallet/{email}")
def get_wallet(email: str) -> Dict[str, Any]:
    db = load_json(DB_PATH)
    # Filter certificates by student email
    wallet_certs = []
    for cid, cert in db.items():
        if cert.get("student_email") == email:
            wallet_certs.append({
                "id": cid,
                "data": cert["data"],
                "tx_hash": cert["tx_hash"]
            })
    return {"wallet": wallet_certs}

@router.get("/verify/{query}")
def verify_certificate(query: str) -> Dict[str, Any]:
    db = load_json(DB_PATH)
    ledger = load_json(LEDGER_PATH)
    
    cert = None
    # Support searching by ID (10 chars) or TX Hash (start with 0x)
    if query.startswith("0x"):
        # Search by Transaction Hash
        for cid, record in db.items():
            if record.get("tx_hash") == query:
                cert = record
                break
    else:
        # Search by Cert ID
        cert = db.get(query)
        
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate ID or TX Hash not found in local database")

    # Double check against "Ledger"
    on_chain = ledger.get(cert["tx_hash"])
    
    if not on_chain:
        raise HTTPException(status_code=404, detail="Ledger mismatch: Transaction not found on simulated blockchain")
        
    cid = on_chain.get("cid")
    ipfs_url = f"https://ipfs.io/ipfs/{cid}" if cid else None
        
    return {
        "valid": cert["valid"],
        "data": cert["data"],
        "hash": cert["hash"],
        "cid": cid,
        "ipfs_url": ipfs_url,
        "blockchain": {
            "tx_hash": cert["tx_hash"],
            "block": on_chain.get("block") if on_chain else "Unknown",
            "timestamp": on_chain.get("timestamp") if on_chain else time.time(),
            "status": "Verified on Chain"
        }
    }

@router.get("/issued")
def get_issued_certificates(issuer: Optional[str] = None) -> Dict[str, Any]:
    db = load_json(DB_PATH)
    issued = []
    for cid, cert in db.items():
        cert_issuer = cert["data"].get("issuer")
        if issuer and cert_issuer != issuer:
            continue
            
        issued.append({
            "id": cid,
            "student_name": cert["data"].get("student_name"),
            "course": cert["data"].get("course"),
            "date": cert["data"].get("date"),
            "valid": cert.get("valid", True)
        })
    # Sort by date (optional, but good UX) - simplified: return as is
    return {"certificates": issued}
