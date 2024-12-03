import jwt from "jsonwebtoken";

export const generateTokens = (username: string, userType: string) => {
  const accessToken = jwt.sign(
    { username, userType },
    process.env.JWT_SECRET!,
    {
      expiresIn: "4h",
    }
  );
  const refreshToken = jwt.sign(
    { username, userType },
    process.env.JWT_REFRESH_SECRET!,
    {
      expiresIn: "7d",
    }
  );
  return { accessToken, refreshToken };
};
