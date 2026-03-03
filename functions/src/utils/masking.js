function maskEmail(email = "") {
  if (!email.includes("@")) {
    return "***";
  }
  const [name, domain] = email.split("@");
  const safeName = `${name.slice(0, 1)}***${name.slice(-1)}`;
  return `${safeName}@${domain}`;
}

function maskPhone(phone = "") {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) {
    return "***";
  }
  return `${digits.slice(0, 2)}***${digits.slice(-2)}`;
}

function maskContact(value = "") {
  if (value.includes("@")) {
    return maskEmail(value);
  }
  return maskPhone(value);
}

module.exports = {
  maskEmail,
  maskPhone,
  maskContact,
};
