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
