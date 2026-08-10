# Brahma Echo Safety and Security Overview

This document summarizes Brahma Echo's current safety model, local exposure, and gateway behavior based on the repository code.

## 1. Local credential handling

- API keys are stored in `config/api_keys.json`.
- The code reads `gemini_api_key` and `openrouter_api_key` directly from this file.
- This file is a local configuration artifact and should never be committed to source control.
- No application-level secret vault is implemented; security depends on file system permissions and local access controls.

## 2. AI provider access

- Brahma Echo uses Gemini as the primary AI provider and OpenRouter as a fallback.
- Both API keys are loaded from the local config file and sent to the respective service clients.
- The repository does not include built-in secret encryption for `api_keys.json`; the file is plaintext JSON.

## 3. Brahma Connect gateway exposure

Brahma Connect is the local device gateway layer for Brahma Echo.

### Configuration

- Default gateway config: `config/brahma_connect.json`
- Default host: `0.0.0.0`
- Default port: `8765`
- Default advertise: `true`
- Default pairing TTL: `300` seconds

Since the gateway binds to `0.0.0.0`, it is reachable from any interface on the host machine unless network or OS firewall rules prevent it.

### Discovery

- Optional mDNS discovery is provided through `brahma_connect.gateway.discovery.GatewayDiscovery` and Zeroconf.
- Discovery advertises service `_BRAHMA._tcp.local.` only when the Zeroconf library is installed and `advertise` is enabled.

### Local network consideration

- The gateway is designed as a local network transport.
- There is no built-in TLS/SSL for the gateway websocket in the current code.
- This means gateway traffic is not encrypted end-to-end by default and relies on LAN trust.

## 4. Pairing and authentication flow

### Pairing

- Pairing uses a temporary pairing offer created by `brahma_connect.gateway.pairing.PairingManager`.
- Each offer includes:
  - `pairing_token`
  - `pairing_code` (6-digit code)
  - expiration timestamp
- Pairing offers expire after `pairing_ttl_seconds` (default 300 seconds).

### Approval

- Incoming device connections begin with `HELLO` and create a pending request.
- A user must explicitly approve or reject each pending pairing request through the app.
- Approved devices are added to the registry and issued a permanent `device_secret`.

### Device credentials

- Device records are stored in `config/brahma_connect/devices.json`.
- Device secrets are not stored plaintext; the repository stores `secret_hash`.
- `secret_hash` is calculated with `hashlib.sha256(secret.encode('utf-8')).hexdigest()`.
- Authentication compares secrets using constant-time comparison (`hmac.compare_digest`) to avoid timing attacks.

### Authentication

- Authenticated device connections use the websocket `/ws` endpoint and send an `AUTHENTICATE` message with:
  - `device_id`
  - `device_secret`
- If authentication succeeds, the device is marked online and registered in the connection hub.
- Revoked devices are rejected by `DeviceManager.authenticate`.

## 5. Gateway request handling

- The gateway includes a simple REST interface for:
  - `/gateway/info`
  - `/gateway/pair`
  - `/gateway/devices`
  - `/gateway/devices/{device_id}/revoke`
  - `/gateway/devices/{device_id}/forget`
  - `/gateway/pending`
  - `/gateway/pending/{pending_id}/approve`
  - `/gateway/pending/{pending_id}/reject`
- These endpoints are available on the same host and port as the gateway service.
- There is no API authentication for these admin endpoints in the code as provided.
- Therefore, local network access to the gateway REST API is effectively trusted.

## 6. Firewall behavior

### Dashboard firewall helper

- The local dashboard (`dashboard/server.py`) includes `_ensure_network_access`.
- That helper attempts to open a Windows firewall rule for dashboard ports, and it also contains cross-platform stubs for macOS/Linux.
- The dashboard uses port `8000` by default and a legacy HTTPS alias on `8001`.
- The firewall helper is executed when the dashboard starts.

### Gateway firewall behavior

- The gateway itself does not appear to automatically open OS firewall ports.
- The default `0.0.0.0:8765` binding means administrators should verify firewall rules manually if they want to limit exposure.

## 7. Security strengths

- Pairing is explicit and requires user approval.
- Device secret handling uses hashed secrets and constant-time comparison.
- Temporary pairing codes expire quickly.
- Device revocation and forgetting are supported.
- The dashboard encrypts local commands using AES-256-CBC with a session-derived key.

## 8. Security limitations

- No built-in gateway TLS/SSL for `/ws`; websocket traffic is plaintext on the LAN.
- Admin REST endpoints have no auth layer in the current codebase.
- Local API key storage is plaintext.
- The gateway host default of `0.0.0.0` exposes the service broadly unless OS firewall restrictions are in place.
- There is no remote access firewall or gateway-level authentication beyond local pairing and device credentials.

## 9. Recommendations

- Keep `config/api_keys.json` private and out of version control.
- Use OS firewall rules to restrict access to port `8765` if Brahma Connect is enabled.
- Disable `advertise` in `config/brahma_connect.json` unless discovery is needed.
- Revoke lost or untrusted devices using `/gateway/devices/{device_id}/revoke`.
- Consider running Brahma Echo on a trusted local network only.
- If secure remote access is required, add HTTPS/TLS support for the gateway websocket and admin REST endpoints.

## 10. Summary

Brahma Echo is built to operate primarily as a local trusted assistant with explicit pairing and device control. Its current safety model relies on local network trust, explicit user approval, and secure device secret storage, while its gateway is not currently protected by TLS or API auth beyond pairing and local network access.
