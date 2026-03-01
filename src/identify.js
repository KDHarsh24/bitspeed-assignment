const { pool } = require('./db');

async function identify(email, phoneNumber) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [matches] = await conn.query(
      `SELECT * FROM Contact WHERE deletedAt IS NULL AND (email = ? OR phoneNumber = ?)`,
      [email || null, phoneNumber || null]
    );

    if (matches.length === 0) {
      const [result] = await conn.query(
        `INSERT INTO Contact (email, phoneNumber, linkPrecedence) VALUES (?, ?, 'primary')`,
        [email || null, phoneNumber || null]
      );
      await conn.commit();
      return {
        primaryContactId: result.insertId,
        emails: email ? [email] : [],
        phoneNumbers: phoneNumber ? [String(phoneNumber)] : [],
        secondaryContactIds: [],
      };
    }

    const rootIds = [...new Set(matches.map(c => c.linkedId || c.id))];
    const [group] = await conn.query(
      `SELECT * FROM Contact WHERE deletedAt IS NULL AND (id IN (?) OR linkedId IN (?)) ORDER BY createdAt ASC`,
      [rootIds, rootIds]
    );

    const primaries = group.filter(c => c.linkPrecedence === 'primary').sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const winner = primaries[0];
    const losers = primaries.slice(1);

    if (losers.length > 0) {
      const loserIds = losers.map(p => p.id);
      await conn.query(
        `UPDATE Contact SET linkPrecedence = 'secondary', linkedId = ?, updatedAt = NOW() WHERE id IN (?)`,
        [winner.id, loserIds]
      );
      await conn.query(
        `UPDATE Contact SET linkedId = ?, updatedAt = NOW() WHERE linkedId IN (?)`,
        [winner.id, loserIds]
      );
      for (const c of group) {
        if (loserIds.includes(c.id)) { c.linkPrecedence = 'secondary'; c.linkedId = winner.id; }
        else if (loserIds.includes(c.linkedId)) { c.linkedId = winner.id; }
      }
    }

    const existingEmails = new Set(group.map(c => c.email).filter(Boolean));
    const existingPhones = new Set(group.map(c => c.phoneNumber).filter(Boolean));
    const hasNewInfo = (email && !existingEmails.has(email)) ||(phoneNumber && !existingPhones.has(String(phoneNumber)));

    if (hasNewInfo) {
      const [result] = await conn.query(
        `INSERT INTO Contact (email, phoneNumber, linkedId, linkPrecedence) VALUES (?, ?, ?, 'secondary')`,
        [email || null, phoneNumber ? String(phoneNumber) : null, winner.id]
      );
      group.push({
        id: result.insertId,
        email: email || null,
        phoneNumber: phoneNumber ? String(phoneNumber) : null,
        linkedId: winner.id,
        linkPrecedence: 'secondary',
      });
    }

    await conn.commit();
    return buildResponse(winner.id, group);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

function buildResponse(primaryId, contacts) {
  const emails = [];
  const phoneNumbers = [];
  const secondaryContactIds = [];
  const primary = contacts.find(c => c.id === primaryId);
  if (primary?.email) emails.push(primary.email);
  if (primary?.phoneNumber) phoneNumbers.push(String(primary.phoneNumber));

  for (const c of contacts) {
    if (c.id === primaryId) continue;
    secondaryContactIds.push(c.id);
    if (c.email && !emails.includes(c.email)) emails.push(c.email);
    if (c.phoneNumber && !phoneNumbers.includes(String(c.phoneNumber))) phoneNumbers.push(String(c.phoneNumber));
  }

  return { primaryContactId: primaryId, emails, phoneNumbers, secondaryContactIds };
}

module.exports = { identify };
