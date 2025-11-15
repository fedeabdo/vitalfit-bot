function normalizeSenderNumber(senderJid) {
  return String(senderJid).split('@')[0];
}

module.exports = { normalizeSenderNumber };
