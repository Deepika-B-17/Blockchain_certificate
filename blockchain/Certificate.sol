// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CertificateRegistry {
    address public admin;
    // Mapping from Certificate Hash to Validity Boolean
    mapping(bytes32 => bool) public certificates;
    // Mapping from Certificate Hash to Issuer Name (Optional metadata on-chain)
    mapping(bytes32 => string) public issuers;

    event CertificateIssued(bytes32 indexed certificateHash, string issuer);
    event CertificateRevoked(bytes32 indexed certificateHash);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    // Function to issue a new certificate
    function issueCertificate(bytes32 _hash, string memory _issuer) public {
        // In a real system, you might restrict who can issue. 
        // For this demo, we allow anyone to call it, or you could add onlyAdmin.
        // For a platform, usually registered institutions can issue.
        
        require(!certificates[_hash], "Certificate already exists");
        certificates[_hash] = true;
        issuers[_hash] = _issuer;
        emit CertificateIssued(_hash, _issuer);
    }

    // Function to verify a certificate
    function verifyCertificate(bytes32 _hash) public view returns (bool, string memory) {
        return (certificates[_hash], issuers[_hash]);
    }

    // Optional: Revoke certificate
    function revokeCertificate(bytes32 _hash) public onlyAdmin {
        certificates[_hash] = false;
        emit CertificateRevoked(_hash);
    }
}
