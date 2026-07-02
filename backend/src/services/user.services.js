import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

export const hashPassword = async (pass) => {
    return await bcrypt.hash(pass, 10);
};

export const isPasswordCorrect = async (pass, hashedPassword) => {
    return await bcrypt.compare(pass, hashedPassword);
};

export const generateAccessToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            username: user.username,
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );
};

export const generateRefreshToken = (user) => {
    return jwt.sign({ id: user.id }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    });
};

export const generateTemporaryToken = () => {
    const unHashedToken = crypto.randomBytes(20).toString("hex");

    const hashedToken = crypto
        .createHash("sha256")
        .update(unHashedToken)
        .digest("hex");

    const tokenExpiry = Date.now() + 20 * 60 * 1000;
    return { unHashedToken, hashedToken, tokenExpiry };
};
