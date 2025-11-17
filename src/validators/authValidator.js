export const validateLoginData = (username, password) => {
  if (!username || username.trim() === "") {
    return "Username is required";
  }

  if (!password || password.trim() === "") {
    return "Password is required";
  }

  if (password.length < 6) {
    return "Password must be at least 6 characters long";
  }

  return null;
};

export const validateRegisterData = (username, email, password) => {
  if (!username || username.trim() === "") {
    return "Username is required";
  }

  if (!email || email.trim() === "") {
    return "Email is required";
  }

  if (!password || password.trim() === "") {
    return "Password is required";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters long";
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Invalid email address";
  }

  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    return "Username can only contain letters, numbers, and underscores";
  }

  return null;
};
