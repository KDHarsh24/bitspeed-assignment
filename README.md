# Bitespeed Identity Reconciliation

Identifies and links customer contacts across multiple purchases.

## Setup

```bash
npm install
npm start
```

## Endpoint

**POST** `/identify`

```json
{ "email": "string", "phoneNumber": "string" }
```

At least one field required.

---

## Examples

### New contact
```bash
POST /identify
{ "email": "lorraine@hillvalley.edu", "phoneNumber": "123456" }
```
```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["lorraine@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": []
  }
}
```

---

### Same phone, new email → secondary created
```bash
POST /identify
{ "email": "mcfly@hillvalley.edu", "phoneNumber": "123456" }
```
```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["lorraine@hillvalley.edu", "mcfly@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [2]
  }
}
```

---

### Two separate customers linked → older becomes primary
```bash
POST /identify
{ "email": "george@hillvalley.edu", "phoneNumber": "717171" }
```
```json
{
  "contact": {
    "primaryContactId": 3,
    "emails": ["george@hillvalley.edu", "biffsucks@hillvalley.edu"],
    "phoneNumbers": ["919191", "717171"],
    "secondaryContactIds": [4]
  }
}
```
